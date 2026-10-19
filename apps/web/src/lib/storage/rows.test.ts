import type { Progress } from "@overnover/core";
import { describe, expect, it } from "vitest";
import { masteredToRow, reviewToRow, rowsToProgress, settingsToRows, topicToRow } from "./rows";

describe("sheet rows", () => {
  it("round-trips progress", () => {
    const progress: Progress = {
      topics: [
        {
          id: "t1",
          title: "Ser y estar",
          subject: "Spanish grammar",
          kind: "language",
          targetLanguage: "Spanish",
          instructions: "B1 level",
          rules: [{ id: "r1", text: "Use estar for location" }],
          sourceText: "…",
          createdAt: "2026-10-18T00:00:00.000Z",
        },
      ],
      review: [{ topicId: "t1", ruleId: "r1", step: 1, dueAt: "2026-10-21T00:00:00.000Z", status: "open" }],
      mastered: [
        {
          topicId: "t1",
          ruleId: "r1",
          prompt: "Juan ___ en casa.",
          answer: "está",
          masteredAt: "2026-10-19T00:00:00.000Z",
        },
      ],
      settings: { language: "English", types: { language: ["translate"] }, count: 12 },
    };
    // The Sheets API returns every cell as a string.
    const asCells = (rows: (string | number)[][]) => rows.map((r) => r.map(String));
    const back = rowsToProgress(
      asCells(progress.topics.map(topicToRow)),
      asCells(progress.review.map(reviewToRow)),
      asCells(settingsToRows(progress.settings)),
      asCells(progress.mastered.map(masteredToRow)),
    );
    expect(back).toEqual(progress);
  });

  it("skips empty rows and survives bad JSON", () => {
    const back = rowsToProgress([[], ["t1", "T", "S", "general", "", "", "not json", "", ""]], [[]], []);
    expect(back.topics).toHaveLength(1);
    expect(back.topics[0].rules).toEqual([]);
    expect(back.review).toEqual([]);
    expect(back.mastered).toEqual([]);
    expect(back.settings.count).toBe(10);
  });
});
