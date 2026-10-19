export type TopicKind = "language" | "general";

export const EXERCISE_TYPES = {
  language: ["translate", "fill_gap", "pick_form", "fix_error"],
  general: ["short_answer", "fill_gap", "true_false", "fix_error"],
} as const satisfies Record<TopicKind, readonly string[]>;

export type ExerciseType = (typeof EXERCISE_TYPES)[TopicKind][number];

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  translate: "Translate",
  fill_gap: "Fill the gap",
  pick_form: "Pick the right form",
  fix_error: "Spot and fix the error",
  short_answer: "Short answer",
  true_false: "True or false",
};

/** One short line above each exercise telling the learner what to do; the same every time for a type. */
export function exerciseTask(type: ExerciseType, targetLanguage?: string): string {
  switch (type) {
    case "translate":
      return targetLanguage ? `Translate into ${targetLanguage}.` : "Translate.";
    case "fill_gap":
      return "Write the missing word.";
    case "pick_form":
      return "Write the right form for the gap.";
    case "fix_error":
      return "This sentence has one mistake. Write it correctly.";
    case "short_answer":
      return "Answer in a few words.";
    case "true_false":
      return "True or false?";
  }
}

export interface Rule {
  id: string;
  text: string;
}

export interface Topic {
  id: string;
  title: string;
  /** What is being learned, e.g. "Spanish grammar" or "Cell biology". */
  subject: string;
  kind: TopicKind;
  /** Only for language topics: the language being learned. */
  targetLanguage?: string;
  /** The learner's own guidance for the AI; sent with every call for this topic. */
  instructions: string;
  rules: Rule[];
  /** Text extracted from the material, so new batches can be generated later. */
  sourceText: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  topicId: string;
  type: ExerciseType;
  /** What to do, in the learner's language. */
  instruction: string;
  prompt: string;
  ruleId: string;
  acceptedAnswers: string[];
}

/** One open mistake per topic rule, scheduled on the 1/3/7/14-day ladder. */
export interface ReviewItem {
  topicId: string;
  ruleId: string;
  /** Index into REVIEW_STEPS_DAYS of the interval currently being waited out. */
  step: number;
  dueAt: string;
  status: "open" | "done";
}

/** An exercise answered correctly, kept so new batches practise the same rules with new content. */
export interface MasteredItem {
  topicId: string;
  ruleId: string;
  prompt: string;
  answer: string;
  masteredAt: string;
}

export interface Settings {
  /** The learner's own language: instructions and feedback are written in it. */
  language: string;
  types: Partial<Record<TopicKind, ExerciseType[]>>;
  count: number;
}

/** Everything stored per user: current progress and a short list of mastered exercises, no answer log. */
export interface Progress {
  topics: Topic[];
  review: ReviewItem[];
  mastered: MasteredItem[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { language: "", types: {}, count: 10 };
