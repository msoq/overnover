// Starts a practice session on a topic. Rules with a due mistake are mixed into the
// batch, so review happens in normal sessions without a separate review screen.
import {
  avoidList,
  type Exercise,
  type ExerciseType,
  isDue,
  type ReviewItem,
  type Topic,
} from "@overnover/core";
import { generateExercises } from "./api";
import { useProgress } from "./progress";
import { ruleKey, type SavedSession, saveSession } from "./session";

/** Spreads review exercises evenly through the new ones. */
function mix(review: Exercise[], fresh: Exercise[]): Exercise[] {
  if (review.length === 0) return fresh;
  const out: Exercise[] = [];
  const every = (review.length + fresh.length) / review.length;
  let r = 0;
  let f = 0;
  for (let i = 0; i < review.length + fresh.length; i++) {
    const reviewTurn = r < review.length && (f >= fresh.length || i >= Math.round(r * every));
    out.push(reviewTurn ? review[r++] : fresh[f++]);
  }
  return out;
}

export function useStartSession() {
  const { progress, updateSettings } = useProgress();

  return async (topic: Topic, types: ExerciseType[], count: number): Promise<SavedSession> => {
    const { language } = progress.settings;
    const avoid = avoidList(progress.mastered, topic.id);
    const ruleIds = new Set(topic.rules.map((r) => r.id));
    // At most half the batch is review, so a long list of mistakes doesn't crowd out new material.
    const reviewRules = progress.review
      .filter((r) => r.topicId === topic.id && ruleIds.has(r.ruleId) && isDue(r))
      .slice(0, Math.ceil(count / 2))
      .map((r) => r.ruleId);
    const freshCount = count - reviewRules.length;

    const [fresh, review] = await Promise.all([
      freshCount > 0 ? generateExercises({ language, topic, types, count: freshCount, avoid }) : [],
      reviewRules.length > 0
        ? generateExercises({
            language,
            topic,
            types,
            count: reviewRules.length,
            ruleIds: reviewRules,
            avoid,
          })
        : [],
    ]);

    updateSettings({ types: { ...progress.settings.types, [topic.kind]: types }, count }, { persist: false });
    const session: SavedSession = {
      label: topic.title,
      topicId: topic.id,
      exercises: mix(review, fresh),
      dueRules: reviewRules.map((r) => ruleKey(topic.id, r)),
      answers: [],
      position: 0,
    };
    saveSession(session);
    return session;
  };
}

/** How many of the topic's mistakes are due, i.e. will be mixed into its next session. */
export function dueCount(review: ReviewItem[], topicId: string): number {
  return review.filter((r) => r.topicId === topicId && isDue(r)).length;
}
