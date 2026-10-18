import { describe, expect, it } from "vitest";
import { applyOutcomes, isDue, scheduleCorrectReview, scheduleMistake } from "./srs";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-10-17T10:00:00Z");
const at = (days: number) => new Date(t0.getTime() + days * DAY);

describe("review schedule", () => {
  it("walks 1, 3, 7, 14 days and then closes", () => {
    let item = scheduleMistake("t", "r1", t0);
    expect(item.dueAt).toBe(at(1).toISOString());
    item = scheduleCorrectReview(item, at(1));
    expect(item.dueAt).toBe(at(4).toISOString());
    item = scheduleCorrectReview(item, at(4));
    expect(item.dueAt).toBe(at(11).toISOString());
    item = scheduleCorrectReview(item, at(11));
    expect(item.dueAt).toBe(at(25).toISOString());
    item = scheduleCorrectReview(item, at(25));
    expect(item.status).toBe("done");
  });

  it("does not advance an item answered before it is due", () => {
    const item = scheduleMistake("t", "r1", t0);
    expect(isDue(item, at(0.5))).toBe(false);
    expect(scheduleCorrectReview(item, at(0.5))).toBe(item);
  });
});

describe("applyOutcomes", () => {
  it("opens items for missed rules and advances due reviews", () => {
    const due = { ...scheduleMistake("t", "r2", at(-2)) };
    const out = applyOutcomes(
      [due],
      [
        { topicId: "t", ruleId: "r1", correct: true, isReview: false },
        { topicId: "t", ruleId: "r1", correct: false, isReview: false },
        { topicId: "t", ruleId: "r2", correct: true, isReview: true },
      ],
      t0,
    );
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.ruleId === "r1")?.step).toBe(0);
    expect(out.find((r) => r.ruleId === "r2")?.step).toBe(1);
  });

  it("resets an open item on a new mistake and drops closed ones", () => {
    const last = { ...scheduleMistake("t", "r1", at(-30)), step: 3 };
    const out = applyOutcomes([last], [{ topicId: "t", ruleId: "r1", correct: true, isReview: true }], t0);
    expect(out).toHaveLength(0);
  });
});
