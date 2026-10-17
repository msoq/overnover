/**
 * Normalizes an answer for exact matching: case, accents, punctuation
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

export function matchesAccepted(answer: string, accepted: string[]): boolean {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  return accepted.some((a) => normalizeAnswer(a) === normalized);
}
