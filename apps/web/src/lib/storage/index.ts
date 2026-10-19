import { DEFAULT_SETTINGS, type Progress } from "@overnover/core";
import { STORAGE } from "../config";
import { SheetsStore } from "./sheets";

/** Where a user's progress lives. Swap the implementation to move off Google Sheets. */
export interface ProgressStore {
  load(): Promise<Progress>;
  save(progress: Progress): Promise<void>;
}

const LOCAL_KEY = "overnover.progress";

/** Keeps progress in this browser only; used when no Google client ID is configured. */
class LocalStore implements ProgressStore {
  async load(): Promise<Progress> {
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      if (saved) return JSON.parse(saved) as Progress;
    } catch {
      // Storage unavailable or corrupt: start empty.
    }
    return { topics: [], review: [], mastered: [], settings: { ...DEFAULT_SETTINGS } };
  }

  async save(progress: Progress): Promise<void> {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
  }
}

export function createStore(): ProgressStore {
  return STORAGE === "sheets" ? new SheetsStore() : new LocalStore();
}
