import type { Progress } from "@overnover/core";
import { currentEmail, googleFetch } from "../google";
import type { ProgressStore } from "./index";
import {
  MASTERED_COLUMNS,
  masteredToRow,
  REVIEW_COLUMNS,
  reviewToRow,
  rowsToProgress,
  SETTINGS_COLUMNS,
  settingsToRows,
  TOPIC_COLUMNS,
  topicToRow,
} from "./rows";

const TITLE = "overnover progress";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const TABS = {
  Topics: TOPIC_COLUMNS,
  Review: REVIEW_COLUMNS,
  Settings: SETTINGS_COLUMNS,
  Mastered: MASTERED_COLUMNS,
} as const;
type Tab = keyof typeof TABS;
const TAB_NAMES = Object.keys(TABS) as Tab[];

const lastColumn = (tab: Tab) => String.fromCharCode(64 + TABS[tab].length);
const dataRange = (tab: Tab) => `${tab}!A2:${lastColumn(tab)}`;

/**
 * Progress in a spreadsheet in the user's own Drive. The app only sees files it
 * created (drive.file scope), so it finds or creates its one spreadsheet by name.
 */
export class SheetsStore implements ProgressStore {
  private spreadsheetId: Promise<string> | undefined;

  private cacheKey(): string {
    return `overnover.sheet.${currentEmail() ?? "anon"}`;
  }

  private id(): Promise<string> {
    this.spreadsheetId ??= this.findOrCreate().catch((err) => {
      this.spreadsheetId = undefined;
      throw err;
    });
    return this.spreadsheetId;
  }

  private async findOrCreate(): Promise<string> {
    const cached = localStorage.getItem(this.cacheKey());
    const id = cached ?? (await this.find()) ?? (await this.create());
    if (localStorage.getItem(this.tabsKey(id)) !== TAB_NAMES.join()) {
      await this.addMissingTabs(id).catch((err) => {
        // The cached spreadsheet may have been deleted; look it up again next time.
        localStorage.removeItem(this.cacheKey());
        throw err;
      });
      localStorage.setItem(this.tabsKey(id), TAB_NAMES.join());
    }
    localStorage.setItem(this.cacheKey(), id);
    return id;
  }

  private async find(): Promise<string | undefined> {
    const q = encodeURIComponent(
      `name='${TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    );
    const found = (await (
      await googleFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`)
    ).json()) as { files?: { id: string }[] };
    return found.files?.[0]?.id;
  }

  private async create(): Promise<string> {
    const created = (await (
      await googleFetch(SHEETS, {
        method: "POST",
        body: JSON.stringify({
          properties: { title: TITLE },
          sheets: TAB_NAMES.map((title) => ({ properties: { title } })),
        }),
      })
    ).json()) as { spreadsheetId: string };
    const id = created.spreadsheetId;
    await this.writeHeaders(id, TAB_NAMES);
    localStorage.setItem(this.tabsKey(id), TAB_NAMES.join());
    return id;
  }

  /** Remembers per spreadsheet which tabs were checked, so the check runs once per device. */
  private tabsKey(id: string): string {
    return `overnover.sheet-tabs.${id}`;
  }

  private async writeHeaders(id: string, tabs: Tab[]): Promise<void> {
    await googleFetch(`${SHEETS}/${id}/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: tabs.map((t) => ({ range: `${t}!A1`, values: [[...TABS[t]]] })),
      }),
    });
  }

  /** Spreadsheets made by an older version lack newer tabs; add them with their headers. */
  private async addMissingTabs(id: string): Promise<void> {
    const meta = (await (await googleFetch(`${SHEETS}/${id}?fields=sheets.properties.title`)).json()) as {
      sheets?: { properties: { title: string } }[];
    };
    const existing = new Set(meta.sheets?.map((s) => s.properties.title));
    const missing = TAB_NAMES.filter((t) => !existing.has(t));
    if (missing.length === 0) return;
    await googleFetch(`${SHEETS}/${id}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) }),
    });
    await this.writeHeaders(id, missing);
  }

  /** One request: all tabs. */
  async load(): Promise<Progress> {
    const id = await this.id();
    const ranges = TAB_NAMES.map((t) => `ranges=${encodeURIComponent(dataRange(t))}`).join("&");
    const res = await googleFetch(`${SHEETS}/${id}/values:batchGet?${ranges}`).catch((err) => {
      // The cached spreadsheet may have been deleted; look it up again next time.
      localStorage.removeItem(this.cacheKey());
      this.spreadsheetId = undefined;
      throw err;
    });
    const data = (await res.json()) as { valueRanges: { values?: string[][] }[] };
    const [topics, review, settings, mastered] = data.valueRanges.map((r) => r.values ?? []);
    return rowsToProgress(topics, review, settings, mastered);
  }

  /** Rewrites all tabs: clear, then write. Data is small, so this stays fast. */
  async save(progress: Progress): Promise<void> {
    const id = await this.id();
    await googleFetch(`${SHEETS}/${id}/values:batchClear`, {
      method: "POST",
      body: JSON.stringify({ ranges: TAB_NAMES.map(dataRange) }),
    });
    await googleFetch(`${SHEETS}/${id}/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: [
          { range: "Topics!A2", values: progress.topics.map(topicToRow) },
          { range: "Review!A2", values: progress.review.map(reviewToRow) },
          { range: "Settings!A2", values: settingsToRows(progress.settings) },
          { range: "Mastered!A2", values: progress.mastered.map(masteredToRow) },
        ],
      }),
    });
  }
}
