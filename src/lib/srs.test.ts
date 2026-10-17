import { describe, expect, it } from "vitest";
import { isDue, scheduleCorrectReview, scheduleMistake } from "./srs";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-10-17T10:00:00Z");
const at = (days: number) => new Date(t0.getTime() + days * DAY);

describe("review schedule", () => {
  it("walks 1, 3, 7, 14 days and then closes", () => {
    let item = scheduleMistake(undefined, "t", "r1", t0);
    expect(item.dueAt).toBe(at(1).toISOString());

    item = scheduleCorrectReview(item, at(1));
    expect(item.dueAt).toBe(at(4).toISOString());
    item = scheduleCorrectReview(item, at(4));
    expect(item.dueAt).toBe(at(11).toISOString());
    item = scheduleCorrectReview(item, at(11));
    expect(item.dueAt).toBe(at(25).toISOString());
    expect(item.status).toBe("open");
    item = scheduleCorrectReview(item, at(25));
    expect(item.status).toBe("done");
  });

  it("does not advance an item answered before it is due", () => {
    const item = scheduleMistake(undefined, "t", "r1", t0);
    expect(isDue(item, at(0.5))).toBe(false);
    expect(scheduleCorrectReview(item, at(0.5))).toBe(item);
  });

  it("resets to one day on a new mistake, keeping the id", () => {
    let item = scheduleMistake(undefined, "t", "r1", t0);
    item = scheduleCorrectReview(item, at(1));
    const reset = scheduleMistake(item, "t", "r1", at(4));
    expect(reset.id).toBe(item.id);
    expect(reset.step).toBe(0);
    expect(reset.dueAt).toBe(at(5).toISOString());
  });
});
