import { normalizeAnswer } from "./check";
import type { MasteredItem } from "./types";

/** How many mastered exercises are kept per topic; older ones drop off. */
export const MASTERED_PER_TOPIC = 50;

const key = (topicId: string, prompt: string) => `${topicId}\u0000${normalizeAnswer(prompt)}`;

/**
 * Adds a session's correctly answered exercises. A prompt already on the list
 * is replaced by the newer one, and each topic keeps only its newest entries.
 */
export function addMastered(list: MasteredItem[], added: MasteredItem[]): MasteredItem[] {
  const byKey = new Map<string, MasteredItem>();
  for (const m of [...list, ...added]) {
    const k = key(m.topicId, m.prompt);
    byKey.delete(k);
    byKey.set(k, m);
  }
  const newestFirst = [...byKey.values()].sort((a, b) => b.masteredAt.localeCompare(a.masteredAt));
  const perTopic = new Map<string, number>();
  return newestFirst.filter((m) => {
    const n = (perTopic.get(m.topicId) ?? 0) + 1;
    perTopic.set(m.topicId, n);
    return n <= MASTERED_PER_TOPIC;
  });
}

/** The topic's mastered exercises as the generator's avoid list. */
export function avoidList(list: MasteredItem[], topicId: string): Pick<MasteredItem, "prompt" | "answer">[] {
  return list.filter((m) => m.topicId === topicId).map(({ prompt, answer }) => ({ prompt, answer }));
}

/** True when the prompt matches one already mastered, ignoring case, accents and punctuation. */
export function isRepeat(prompt: string, avoid: Pick<MasteredItem, "prompt">[]): boolean {
  const p = normalizeAnswer(prompt);
  return avoid.some((a) => normalizeAnswer(a.prompt) === p);
}
