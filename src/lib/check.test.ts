import { describe, expect, it } from "vitest";
import { matchesAccepted, normalizeAnswer } from "./check";

describe("normalizeAnswer", () => {
  it("ignores case, accents, punctuation and spacing", () => {
    expect(normalizeAnswer("  ¡Que  LLEGUE a tiempo! ")).toBe("que llegue a tiempo");
    expect(normalizeAnswer("Quizá")).toBe(normalizeAnswer("quiza"));
    expect(normalizeAnswer("¿Está?")).toBe("esta");
  });
});

describe("matchesAccepted", () => {
  it("matches any accepted variant", () => {
    expect(matchesAccepted("que llegue a tiempo", ["¡Que llegue a tiempo!"])).toBe(true);
    expect(matchesAccepted("tenga", ["tenga", "Quizá tenga razón."])).toBe(true);
    expect(matchesAccepted("quiza tenga razon", ["tenga", "Quizá tenga razón."])).toBe(true);
  });
  it("rejects a different form and empty answers", () => {
    expect(matchesAccepted("tiene", ["tenga"])).toBe(false);
    expect(matchesAccepted("  !  ", ["tenga"])).toBe(false);
  });
});
