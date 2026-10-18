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

export interface Settings {
  /** The learner's own language: instructions and feedback are written in it. */
  language: string;
  types: Partial<Record<TopicKind, ExerciseType[]>>;
  count: number;
}

/** Everything stored per user: current progress only, no answer log. */
export interface Progress {
  topics: Topic[];
  review: ReviewItem[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { language: "", types: {}, count: 10 };
