import { sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";
import { JWT } from "google-auth-library";
import type { Attempt, Exercise, ReviewItem, Topic } from "../types";
import type { Store } from "./index";

/** Column order per sheet. Arrays and objects are stored as JSON text. */
const TABLES = {
  Topics: ["id", "title", "fromLang", "toLang", "createdAt", "rules", "sourceText"],
  Exercises: ["id", "topicId", "type", "instruction", "prompt", "ruleId", "acceptedAnswers", "reviewItemId", "createdAt"],
  Attempts: ["id", "exerciseId", "topicId", "answer", "result", "feedback", "checkedBy", "createdAt"],
  Review: ["id", "topicId", "ruleId", "step", "dueAt", "status", "updatedAt"],
} as const;

type Table = keyof typeof TABLES;

const JSON_FIELDS = new Set(["rules", "acceptedAnswers"]);
const NUMBER_FIELDS = new Set(["step"]);

function toRow(table: Table, obj: object): string[] {
  const record = obj as Record<string, unknown>;
  return TABLES[table].map((col) => {
    const v = record[col];
    if (v === undefined || v === null) return "";
    return JSON_FIELDS.has(col) ? JSON.stringify(v) : String(v);
  });
}

function fromRow<T>(table: Table, row: string[]): T {
  const obj: Record<string, unknown> = {};
  TABLES[table].forEach((col, i) => {
    const v = row[i] ?? "";
    if (JSON_FIELDS.has(col)) obj[col] = v ? JSON.parse(v) : [];
    else if (NUMBER_FIELDS.has(col)) obj[col] = Number(v);
    else if (v !== "") obj[col] = v;
  });
  return obj as T;
}

function columnLetter(n: number): string {
  return String.fromCharCode("A".charCodeAt(0) + n - 1);
}

/** Stores each record type in its own tab of one spreadsheet, shared with a service account. */
export class SheetsStore implements Store {
  private api: sheets_v4.Sheets;
  private spreadsheetId: string;
  private ready: Promise<void> | undefined;

  constructor() {
    const { GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      throw new Error(
        "STORAGE=sheets needs GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local",
      );
    }
    const auth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.api = sheetsApi({ version: "v4", auth });
    this.spreadsheetId = GOOGLE_SHEET_ID;
  }

  /** Creates any missing tabs with their header rows on first use. */
  private ensureTabs(): Promise<void> {
    this.ready ??= (async () => {
      const meta = await this.api.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
      const existing = new Set(meta.data.sheets?.map((s) => s.properties?.title));
      const missing = (Object.keys(TABLES) as Table[]).filter((t) => !existing.has(t));
      if (missing.length === 0) return;
      await this.api.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
      });
      await this.api.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: missing.map((t) => ({ range: `${t}!A1`, values: [[...TABLES[t]]] })),
        },
      });
    })().catch((err) => {
      this.ready = undefined;
      throw err;
    });
    return this.ready;
  }

  private async rows(table: Table): Promise<string[][]> {
    await this.ensureTabs();
    const res = await this.api.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${table}!A2:${columnLetter(TABLES[table].length)}`,
    });
    return (res.data.values as string[][] | undefined) ?? [];
  }

  private async all<T>(table: Table): Promise<T[]> {
    return (await this.rows(table)).filter((r) => r[0]).map((r) => fromRow<T>(table, r));
  }

  private async append(table: Table, objs: object[]): Promise<void> {
    if (objs.length === 0) return;
    await this.ensureTabs();
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${table}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: objs.map((o) => toRow(table, o)) },
    });
  }

  /** Overwrites the row whose id matches, or appends it if there is none. */
  private async upsert(table: Table, obj: { id: string }): Promise<void> {
    const index = (await this.rows(table)).findIndex((r) => r[0] === obj.id);
    if (index < 0) return this.append(table, [obj]);
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${table}!A${index + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [toRow(table, obj)] },
    });
  }

  listTopics() {
    return this.all<Topic>("Topics");
  }
  async getTopic(id: string) {
    return (await this.listTopics()).find((t) => t.id === id);
  }
  addTopic(topic: Topic) {
    return this.append("Topics", [topic]);
  }

  addExercises(exercises: Exercise[]) {
    return this.append("Exercises", exercises);
  }
  async getExercise(id: string) {
    return (await this.all<Exercise>("Exercises")).find((e) => e.id === id);
  }
  updateExercise(exercise: Exercise) {
    return this.upsert("Exercises", exercise);
  }

  addAttempt(attempt: Attempt) {
    return this.append("Attempts", [attempt]);
  }

  listReviewItems() {
    return this.all<ReviewItem>("Review");
  }
  saveReviewItem(item: ReviewItem) {
    return this.upsert("Review", item);
  }
}
