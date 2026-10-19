import { describe, expect, it } from "vitest";
import { addMastered, avoidList, isRepeat, MASTERED_PER_TOPIC } from "./mastered";
import type { MasteredItem } from "./types";

const item = (topicId: string, prompt: string, day: number): MasteredItem => ({
  topicId,
  ruleId: "r1",
  prompt,
  answer: "a",
  masteredAt: new Date(Date.UTC(2026, 9, day)).toISOString(),
});

describe("mastered exercises", () => {
  it("replaces a repeated prompt with the newer one", () => {
    const list = addMastered([item("t1", "Quizá ___ razón.", 1)], [item("t1", "quiza ___ razon", 2)]);
    expect(list).toHaveLength(1);
    expect(list[0].prompt).toBe("quiza ___ razon");
  });

  it("keeps only the newest entries per topic", () => {
    const many = Array.from({ length: MASTERED_PER_TOPIC + 5 }, (_, i) => item("t1", `p${i}`, 1 + (i % 28)));
    const list = addMastered([item("t2", "other", 1)], many);
    expect(list.filter((m) => m.topicId === "t1")).toHaveLength(MASTERED_PER_TOPIC);
    expect(list.some((m) => m.topicId === "t2")).toBe(true);
  });

  it("builds the avoid list and spots repeats", () => {
    const list = [item("t1", "¡Que llegue a tiempo!", 1), item("t2", "x", 1)];
    const avoid = avoidList(list, "t1");
    expect(avoid).toEqual([{ prompt: "¡Que llegue a tiempo!", answer: "a" }]);
    expect(isRepeat("que llegue a tiempo", avoid)).toBe(true);
    expect(isRepeat("Que llegues a tiempo", avoid)).toBe(false);
  });
});
