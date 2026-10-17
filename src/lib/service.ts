import { checkAnswer, generateExercises, readTopic, type TopicInput } from "./ai";
import { matchesAccepted } from "./check";
import { newId } from "./id";
import { isDue, scheduleCorrectReview, scheduleMistake } from "./srs";
import { getStore } from "./store";
import type { AttemptResult, Exercise, ExerciseType, PublicExercise, Topic } from "./types";

const MAX_REVIEW_SESSION = 20;

export class NotFoundError extends Error {}

export interface TopicSummary extends Topic {
  openMistakes: number;
  dueMistakes: number;
}

export async function listTopics(): Promise<TopicSummary[]> {
  const store = getStore();
  const [topics, review] = await Promise.all([store.listTopics(), store.listReviewItems()]);
  const now = new Date();
  return topics
    .map((t) => {
      const open = review.filter((r) => r.topicId === t.id && r.status === "open");
      return { ...t, openMistakes: open.length, dueMistakes: open.filter((r) => isDue(r, now)).length };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTopic(id: string): Promise<Topic> {
  const topic = await getStore().getTopic(id);
  if (!topic) throw new NotFoundError("Topic not found");
  return topic;
}

export async function createTopic(input: TopicInput): Promise<Topic> {
  const draft = await readTopic(input);
  const topic: Topic = {
    id: newId(),
    title: draft.title,
    fromLang: input.fromLang,
    toLang: input.toLang,
    sourceText: draft.sourceText.slice(0, 40_000),
    rules: draft.rules.map((text, i) => ({ id: `r${i + 1}`, text })),
    createdAt: new Date().toISOString(),
  };
  await getStore().addTopic(topic);
  return topic;
}

function toPublic(e: Exercise, topic: Topic): PublicExercise {
  const { acceptedAnswers: _hidden, ...rest } = e;
  return { ...rest, ruleText: topic.rules.find((r) => r.id === e.ruleId)?.text ?? "", topicTitle: topic.title };
}

export async function startSession(topicId: string, types: ExerciseType[], count: number): Promise<PublicExercise[]> {
  const topic = await getTopic(topicId);
  const generated = await generateExercises({ topic, types, count });
  const now = new Date().toISOString();
  const exercises: Exercise[] = generated.map((g) => ({ ...g, id: newId(), topicId, createdAt: now }));
  await getStore().addExercises(exercises);
  return exercises.map((e) => toPublic(e, topic));
}

/** Fresh exercises for open mistakes: only due ones, or all of them. */
export async function startReview(mode: "due" | "all", types: ExerciseType[]): Promise<PublicExercise[]> {
  const store = getStore();
  const now = new Date();
  const items = (await store.listReviewItems())
    .filter((r) => r.status === "open" && (mode === "all" || isDue(r, now)))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, MAX_REVIEW_SESSION);

  const byTopic = new Map<string, typeof items>();
  for (const item of items) byTopic.set(item.topicId, [...(byTopic.get(item.topicId) ?? []), item]);

  const out: PublicExercise[] = [];
  for (const [topicId, topicItems] of byTopic) {
    const topic = await store.getTopic(topicId);
    if (!topic) continue;
    const generated = await generateExercises({ topic, types, count: topicItems.length, ruleIds: topicItems.map((i) => i.ruleId) });
    const exercises: Exercise[] = generated.map((g) => ({
      ...g,
      id: newId(),
      topicId,
      reviewItemId: topicItems.find((i) => i.ruleId === g.ruleId)?.id,
      createdAt: now.toISOString(),
    }));
    await store.addExercises(exercises);
    out.push(...exercises.map((e) => toPublic(e, topic)));
  }
  return out;
}

export async function reviewCounts(): Promise<{ due: number; open: number }> {
  const items = (await getStore().listReviewItems()).filter((r) => r.status === "open");
  const now = new Date();
  return { open: items.length, due: items.filter((r) => isDue(r, now)).length };
}

/** Moves the rule's review item after an answer: mistakes (re)start it, correct reviews advance it. */
async function updateReview(exercise: Exercise, correct: boolean): Promise<void> {
  const store = getStore();
  const items = await store.listReviewItems();
  const existing =
    items.find((r) => r.id === exercise.reviewItemId && r.status === "open") ??
    items.find((r) => r.topicId === exercise.topicId && r.ruleId === exercise.ruleId && r.status === "open");

  if (!correct) {
    await store.saveReviewItem(scheduleMistake(existing, exercise.topicId, exercise.ruleId));
  } else if (existing && exercise.reviewItemId === existing.id) {
    const next = scheduleCorrectReview(existing);
    if (next !== existing) await store.saveReviewItem(next);
  }
}

async function loadExercise(id: string): Promise<{ exercise: Exercise; topic: Topic }> {
  const exercise = await getStore().getExercise(id);
  if (!exercise) throw new NotFoundError("Exercise not found");
  return { exercise, topic: await getTopic(exercise.topicId) };
}

export interface AnswerResult {
  result: AttemptResult;
  feedback: string;
  correctAnswer?: string;
}

export async function submitAnswer(exerciseId: string, answer: string): Promise<AnswerResult> {
  const store = getStore();
  const { exercise, topic } = await loadExercise(exerciseId);

  let correct = matchesAccepted(answer, exercise.acceptedAnswers);
  let feedback = "";
  let checkedBy: "match" | "ai" = "match";
  if (!correct) {
    const verdict = await checkAnswer(exercise, topic, answer);
    checkedBy = "ai";
    correct = verdict.correct;
    feedback = verdict.explanation;
    if (correct) {
      // Remember the variant so the next check is an exact match.
      await store.updateExercise({ ...exercise, acceptedAnswers: [...exercise.acceptedAnswers, answer.trim()] });
    }
  }

  const result: AttemptResult = correct ? "correct" : "wrong";
  await store.addAttempt({
    id: newId(),
    exerciseId,
    topicId: topic.id,
    answer,
    result,
    feedback,
    checkedBy,
    createdAt: new Date().toISOString(),
  });
  await updateReview(exercise, correct);
  return correct ? { result, feedback: "" } : { result, feedback, correctAnswer: exercise.acceptedAnswers[0] };
}

export async function revealAnswer(exerciseId: string): Promise<AnswerResult> {
  const { exercise, topic } = await loadExercise(exerciseId);
  await getStore().addAttempt({
    id: newId(),
    exerciseId,
    topicId: topic.id,
    answer: "",
    result: "revealed",
    feedback: "",
    checkedBy: "reveal",
    createdAt: new Date().toISOString(),
  });
  await updateReview(exercise, false);
  return { result: "revealed", feedback: "", correctAnswer: exercise.acceptedAnswers[0] };
}
