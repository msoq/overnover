// Request and response shapes shared by the web app and the API Worker.
import type { Exercise, ExerciseType, Topic, TopicKind } from "./types";

export interface MaterialFile {
  name: string;
  mimeType: string;
  /** Base64 without the data: prefix. Only PDFs and images are sent; other files become text first. */
  data: string;
}

export interface ReadTopicRequest {
  language: string;
  text?: string;
  files?: MaterialFile[];
  instructions?: string;
}

export interface ReadTopicResponse {
  title: string;
  subject: string;
  kind: TopicKind;
  targetLanguage?: string;
  instructions: string;
  rules: string[];
  sourceText: string;
}

export interface GenerateRequest {
  language: string;
  topic: Pick<
    Topic,
    "id" | "title" | "subject" | "kind" | "targetLanguage" | "instructions" | "rules" | "sourceText"
  >;
  types: ExerciseType[];
  count: number;
  /** For review: one exercise per listed rule, in this order. */
  ruleIds?: string[];
}

export interface GenerateResponse {
  exercises: Exercise[];
}

export interface CheckRequest {
  language: string;
  topic: Pick<Topic, "subject" | "kind" | "targetLanguage" | "instructions" | "rules">;
  exercise: Exercise;
  answer: string;
}

export interface CheckResponse {
  correct: boolean;
  /** For a correct answer with small slips: the learner's answer with the slips fixed. */
  corrected?: string;
  /** For a wrong answer: a short explanation in the learner's language. */
  explanation?: string;
}
