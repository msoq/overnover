// The session in progress lives only in this browser until it ends, so a reload or
// a closed tab can pick up where it left off without touching the progress sheet.
import type { Exercise } from "@overnover/core";

export type AnswerOutcome = "exact" | "slip" | "wrong" | "revealed";

export interface AnswerRecord {
  answer: string;
  outcome: AnswerOutcome;
  /** The correct version shown to the learner (for slips, wrong and revealed answers). */
  correct?: string;
  explanation?: string;
}

export interface SavedSession {
  label: string;
  /** The topic practised, so the summary can offer another batch. Missing in older sessions. */
  topicId?: string;
  exercises: Exercise[];
  /** `topicId:ruleId` of review items that were due when the session started. */
  dueRules: string[];
  answers: AnswerRecord[];
  /** Index of the exercise on screen; equals exercises.length on the summary. */
  position: number;
}

const KEY = "overnover.session";

export const ruleKey = (topicId: string, ruleId: string) => `${topicId}:${ruleId}`;

export function loadSession(): SavedSession | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : undefined;
  } catch {
    return undefined;
  }
}

export function saveSession(session: SavedSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Without storage the session still works; it just can't be resumed.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

export const isCorrect = (outcome: AnswerOutcome) => outcome === "exact" || outcome === "slip";
