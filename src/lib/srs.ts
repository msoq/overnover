import type { ReviewItem } from "./types";
import { newId } from "./id";

export const REVIEW_STEPS_DAYS = [1, 3, 7, 14];

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

export function isDue(item: ReviewItem, now = new Date()): boolean {
  return item.status === "open" && new Date(item.dueAt).getTime() <= now.getTime();
}

/**
 * A wrong or revealed answer on a rule: open a review item for it, or send
 * an existing one back to the first step.
 */
export function scheduleMistake(
  existing: ReviewItem | undefined,
  topicId: string,
  ruleId: string,
  now = new Date(),
): ReviewItem {
  return {
    id: existing?.id ?? newId(),
    topicId,
    ruleId,
    step: 0,
    dueAt: addDays(now, REVIEW_STEPS_DAYS[0]),
    status: "open",
    updatedAt: now.toISOString(),
  };
}

/**
 * A correct review answer. Only a due item moves up the ladder, so practising
 * mistakes early doesn't skip intervals. Passing the last step closes it.
 */
export function scheduleCorrectReview(item: ReviewItem, now = new Date()): ReviewItem {
  if (!isDue(item, now)) return item;
  const next = item.step + 1;
  if (next >= REVIEW_STEPS_DAYS.length) {
    return { ...item, step: next, status: "done", updatedAt: now.toISOString() };
  }
  return { ...item, step: next, dueAt: addDays(now, REVIEW_STEPS_DAYS[next]), updatedAt: now.toISOString() };
}
