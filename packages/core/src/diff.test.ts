import { describe, expect, it } from "vitest";
import { diffChars } from "./diff";

describe("diffChars", () => {
  it("marks added accents in the correct version", () => {
    expect(diffChars("Quiza", "Quizá")).toEqual([
      { text: "Quiz", kind: "same" },
      { text: "a", kind: "removed" },
      { text: "á", kind: "added" },
    ]);
  });
  it("handles identical and empty strings", () => {
    expect(diffChars("abc", "abc")).toEqual([{ text: "abc", kind: "same" }]);
    expect(diffChars("", "ab")).toEqual([{ text: "ab", kind: "added" }]);
  });
});
