"use client";

import { EXERCISE_TYPES, type ExerciseType } from "./types";

export interface Prefs {
  types: ExerciseType[];
  count: number;
  fromLang: string;
  toLang: string;
}

const KEY = "overnover.prefs";
export const DEFAULT_PREFS: Prefs = { types: [...EXERCISE_TYPES], count: 10, fromLang: "Russian", toLang: "Spanish" };

/** Last-used session options, kept in the browser so the next session starts preselected. */
export function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    const types = (saved.types ?? []).filter((t) => EXERCISE_TYPES.includes(t));
    return {
      ...DEFAULT_PREFS,
      ...saved,
      types: types.length ? types : DEFAULT_PREFS.types,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(update: Partial<Prefs>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadPrefs(), ...update }));
  } catch {
    // Storage unavailable: the choice just isn't remembered.
  }
}
