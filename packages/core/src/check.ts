/**
 * Normalizes an answer for matching: case, accents, punctuation
 * (including Spanish ¡ ¿) and whitespace don't count.
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tidy(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

export type MatchResult = { kind: "exact" } | { kind: "slip"; correct: string } | { kind: "none" };

/**
 * Compares an answer with the accepted answers. "slip" means it only differs
 * in accents, case or punctuation, so it counts as correct but the right
 * spelling is worth showing.
 */
export function matchAnswer(answer: string, accepted: string[]): MatchResult {
  const tidied = tidy(answer);
  if (!tidied) return { kind: "none" };
  if (accepted.some((a) => tidy(a) === tidied)) return { kind: "exact" };
  const normalized = normalizeAnswer(answer);
  const match = normalized ? accepted.find((a) => normalizeAnswer(a) === normalized) : undefined;
  return match ? { kind: "slip", correct: match } : { kind: "none" };
}
