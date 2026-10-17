import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.MOCK_AI = "1";
  process.env.STORAGE = "file";
  process.env.STORE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "overnover-")), "store.json");
});

describe("study flow", () => {
  it("creates a topic, checks answers and schedules mistakes for review", async () => {
    const svc = await import("./service");
    const topic = await svc.createTopic({ text: "notes", fromLang: "Russian", toLang: "Spanish" });
    expect(topic.rules.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);

    const batch = await svc.startSession(topic.id, ["fill_gap", "pick_mood"], 4);
    expect(batch).toHaveLength(4);
    expect(batch[0]).not.toHaveProperty("acceptedAnswers");

    // Exact match after normalization, no AI needed.
    expect((await svc.submitAnswer(batch[0].id, "TENGA")).result).toBe("correct");
    // Wrong answer: AI (mock) explains, and the rule goes into review.
    const wrong = await svc.submitAnswer(batch[1].id, "llueva");
    expect(wrong.result).toBe("wrong");
    expect(wrong.correctAnswer).toBe("llueve");
    expect(wrong.feedback).not.toBe("");
    // Revealed counts as a mistake too.
    expect((await svc.revealAnswer(batch[2].id)).result).toBe("revealed");

    expect(await svc.reviewCounts()).toEqual({ open: 2, due: 0 });

    // "Review my mistakes" works before anything is due, with fresh exercises per rule.
    const review = await svc.startReview("all", ["translate"]);
    expect(review).toHaveLength(2);
    expect(review.every((e) => e.reviewItemId)).toBe(true);
    expect(new Set(review.map((e) => e.ruleId))).toEqual(new Set([batch[1].ruleId, batch[2].ruleId]));
  });

  it("remembers answers the AI accepted", async () => {
    const svc = await import("./service");
    const { getStore } = await import("./store");
    const topic = await svc.createTopic({ text: "notes", fromLang: "Russian", toLang: "Spanish" });
    const [ex] = await svc.startSession(topic.id, ["translate"], 1);
    expect((await svc.submitAnswer(ex.id, "ok")).result).toBe("correct");
    expect((await getStore().getExercise(ex.id))?.acceptedAnswers).toContain("ok");
  });
});
