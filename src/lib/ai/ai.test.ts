import { describe, expect, it } from "vitest";
import type { Topic } from "../types";
import { sanitizeExercises } from "./index";
import { parseJsonReply } from "./openrouter";

const topic: Topic = {
  id: "t",
  title: "Subjuntivo",
  fromLang: "Russian",
  toLang: "Spanish",
  sourceText: "",
  rules: [
    { id: "r1", text: "que + subj" },
    { id: "r2", text: "quizá + subj" },
  ],
  createdAt: "",
};

describe("parseJsonReply", () => {
  it("reads fenced or surrounded JSON", () => {
    expect(parseJsonReply<{ a: number }>('Sure:\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(parseJsonReply<{ a: number }>('here {"a": 2} done')).toEqual({ a: 2 });
  });
});

describe("sanitizeExercises", () => {
  it("drops broken items and pins types and rules to known values", () => {
    const out = sanitizeExercises(
      [
        { type: "translate", instruction: "x", prompt: "Пусть", ruleId: "r9", acceptedAnswers: ["Que"] },
        { type: "fix_error", instruction: "x", prompt: "p", ruleId: "r2", acceptedAnswers: ["a"] },
        { type: "fill_gap", instruction: "x", prompt: "", ruleId: "r1", acceptedAnswers: ["a"] },
        { type: "fill_gap", instruction: "x", prompt: "q", ruleId: "r1", acceptedAnswers: [] },
      ],
      topic,
      ["translate", "fill_gap"],
      10,
    );
    expect(out).toHaveLength(2);
    expect(out[0].ruleId).toBe("r1");
    expect(out[1].type).toBe("translate");
  });

  it("assigns review rules by position", () => {
    const out = sanitizeExercises(
      [
        { type: "translate", instruction: "", prompt: "a", ruleId: "r1", acceptedAnswers: ["x"] },
        { type: "translate", instruction: "", prompt: "b", ruleId: "r1", acceptedAnswers: ["y"] },
      ],
      topic,
      ["translate"],
      2,
      ["r2", "r1"],
    );
    expect(out.map((e) => e.ruleId)).toEqual(["r2", "r1"]);
  });
});
