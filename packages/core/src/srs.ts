import type { ReviewItem } from "./types";

export const REVIEW_STEPS_DAYS = [1, 3, 7, 14];

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

export function isDue(item: ReviewItem, now = new Date()): boolean {
  return item.status === "open" && new Date(item.dueAt).getTime() <= now.getTime();
}

/** A wrong or revealed answer on a rule: open a review item, or send it back to the first step. */
export function scheduleMistake(topicId: string, ruleId: string, now = new Date()): ReviewItem {
  return { topicId, ruleId, step: 0, dueAt: addDays(now, REVIEW_STEPS_DAYS[0]), status: "open" };
}

/**
 * A correct review answer. Only a due item moves up the ladder, so practising
 * early doesn't skip intervals. Passing the last step closes it.
 */
export function scheduleCorrectReview(item: ReviewItem, now = new Date()): ReviewItem {
  if (!isDue(item, now)) return item;
  const next = item.step + 1;
  if (next >= REVIEW_STEPS_DAYS.length) return { ...item, step: next, status: "done" };
  return { ...item, step: next, dueAt: addDays(now, REVIEW_STEPS_DAYS[next]) };
}

/**
 * Applies one session's outcomes per rule to the review list. A rule counts as
 * missed if any of its answers in the session was wrong or revealed.
 */
export function applyOutcomes(
  review: ReviewItem[],
  outcomes: { topicId: string; ruleId: string; correct: boolean; isReview: boolean }[],
  now = new Date(),
): ReviewItem[] {
  const key = (topicId: string, ruleId: string) => `${topicId}\u0000${ruleId}`;
  const byRule = new Map<string, { topicId: string; ruleId: string; missed: boolean; reviewed: boolean }>();
  for (const o of outcomes) {
    const k = key(o.topicId, o.ruleId);
    const prev = byRule.get(k);
    byRule.set(k, {
      topicId: o.topicId,
      ruleId: o.ruleId,
      missed: (prev?.missed ?? false) || !o.correct,
      reviewed: (prev?.reviewed ?? false) || o.isReview,
    });
  }

  const next = review.filter((r) => r.status === "open");
  for (const { topicId, ruleId, missed, reviewed } of byRule.values()) {
    const index = next.findIndex((r) => r.topicId === topicId && r.ruleId === ruleId);
    if (missed) {
      const item = scheduleMistake(topicId, ruleId, now);
      if (index >= 0) next[index] = item;
      else next.push(item);
    } else if (reviewed && index >= 0) {
      next[index] = scheduleCorrectReview(next[index], now);
    }
  }
  return next.filter((r) => r.status === "open");
}
