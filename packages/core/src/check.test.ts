import { describe, expect, it } from "vitest";
import { matchAnswer, normalizeAnswer } from "./check";

describe("normalizeAnswer", () => {
  it("ignores case, accents, punctuation and spacing", () => {
    expect(normalizeAnswer("  ¡Que  LLEGUE a tiempo! ")).toBe("que llegue a tiempo");
    expect(normalizeAnswer("¿Está?")).toBe("esta");
  });
});

describe("matchAnswer", () => {
  const accepted = ["Quizá tenga razón.", "tenga"];

  it("is exact when only spacing differs", () => {
    expect(matchAnswer("  tenga ", accepted)).toEqual({ kind: "exact" });
  });
  it("is a slip when accents, case or punctuation differ, and returns the right spelling", () => {
    expect(matchAnswer("quiza tenga razon", accepted)).toEqual({
      kind: "slip",
      correct: "Quizá tenga razón.",
    });
  });
  it("finds no match for a different form or an empty answer", () => {
    expect(matchAnswer("tiene", accepted)).toEqual({ kind: "none" });
    expect(matchAnswer(" ! ", accepted)).toEqual({ kind: "none" });
  });
});
