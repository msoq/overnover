export const EXERCISE_TYPES = ["translate", "fill_gap", "pick_mood", "fix_error"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  translate: "Translate",
  fill_gap: "Fill the gap",
  pick_mood: "Pick the right form",
  fix_error: "Spot and fix the error",
};

export interface Rule {
  id: string;
  text: string;
}

export interface Topic {
  id: string;
  title: string;
  fromLang: string;
  toLang: string;
  /** Text extracted from the upload or prompt; exercises are generated from it. */
  sourceText: string;
  rules: Rule[];
  createdAt: string;
}

export interface Exercise {
  id: string;
  topicId: string;
  type: ExerciseType;
  /** What to do, e.g. "Translate into Spanish". */
  instruction: string;
  /** The sentence or task itself. */
  prompt: string;
  ruleId: string;
  acceptedAnswers: string[];
  /** Set when the exercise was generated to review an open mistake. */
  reviewItemId?: string;
  createdAt: string;
}

export type AttemptResult = "correct" | "wrong" | "revealed";

export interface Attempt {
  id: string;
  exerciseId: string;
  topicId: string;
  answer: string;
  result: AttemptResult;
  feedback: string;
  checkedBy: "match" | "ai" | "reveal";
  createdAt: string;
}

/** One open mistake per topic rule, scheduled on the 1/3/7/14-day ladder. */
export interface ReviewItem {
  id: string;
  topicId: string;
  ruleId: string;
  /** Index into REVIEW_STEPS_DAYS of the interval currently being waited out. */
  step: number;
  dueAt: string;
  status: "open" | "done";
  updatedAt: string;
}

/** Exercise as sent to the browser: no answers until checked or revealed. */
export type PublicExercise = Omit<Exercise, "acceptedAnswers"> & { ruleText: string; topicTitle: string };
