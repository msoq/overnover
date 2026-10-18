import type { Progress } from "@overnover/core";
import { currentEmail, googleFetch } from "../google";
import type { ProgressStore } from "./index";
import {
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
const TABS = { Topics: TOPIC_COLUMNS, Review: REVIEW_COLUMNS, Settings: SETTINGS_COLUMNS } as const;
type Tab = keyof typeof TABS;

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
    if (cached) return cached;

    const q = encodeURIComponent(
      `name='${TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    );
    const found = (await (
      await googleFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`)
    ).json()) as { files?: { id: string }[] };
    let id = found.files?.[0]?.id;

    if (!id) {
      const created = (await (
        await googleFetch(SHEETS, {
          method: "POST",
          body: JSON.stringify({
            properties: { title: TITLE },
            sheets: (Object.keys(TABS) as Tab[]).map((title) => ({ properties: { title } })),
          }),
        })
      ).json()) as { spreadsheetId: string };
      id = created.spreadsheetId;
      await googleFetch(`${SHEETS}/${id}/values:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: (Object.keys(TABS) as Tab[]).map((t) => ({ range: `${t}!A1`, values: [[...TABS[t]]] })),
        }),
      });
    }
    localStorage.setItem(this.cacheKey(), id);
    return id;
  }

  /** One request: all three tabs. */
  async load(): Promise<Progress> {
    const id = await this.id();
    const ranges = (Object.keys(TABS) as Tab[])
      .map((t) => `ranges=${encodeURIComponent(dataRange(t))}`)
      .join("&");
    const res = await googleFetch(`${SHEETS}/${id}/values:batchGet?${ranges}`).catch((err) => {
      // The cached spreadsheet may have been deleted; look it up again next time.
      localStorage.removeItem(this.cacheKey());
      this.spreadsheetId = undefined;
      throw err;
    });
    const data = (await res.json()) as { valueRanges: { values?: string[][] }[] };
    const [topics, review, settings] = data.valueRanges.map((r) => r.values ?? []);
    return rowsToProgress(topics, review, settings);
  }

  /** Rewrites the three tabs: clear, then write. Data is small, so this stays fast. */
  async save(progress: Progress): Promise<void> {
    const id = await this.id();
    await googleFetch(`${SHEETS}/${id}/values:batchClear`, {
      method: "POST",
      body: JSON.stringify({ ranges: (Object.keys(TABS) as Tab[]).map(dataRange) }),
    });
    await googleFetch(`${SHEETS}/${id}/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: [
          { range: "Topics!A2", values: progress.topics.map(topicToRow) },
          { range: "Review!A2", values: progress.review.map(reviewToRow) },
          { range: "Settings!A2", values: settingsToRows(progress.settings) },
        ],
      }),
    });
  }
}
