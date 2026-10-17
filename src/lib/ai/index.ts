import { EXERCISE_TYPES, type Exercise, type ExerciseType, type Topic } from "../types";
import { chatJson, type ChatMessage, type ContentPart } from "./openrouter";
import * as mock from "./mock";

export interface TopicDraft {
  title: string;
  sourceText: string;
  rules: string[];
}

export interface TopicInput {
  text?: string;
  imageDataUrls?: string[];
  fromLang: string;
  toLang: string;
}

export type GeneratedExercise = Pick<Exercise, "type" | "instruction" | "prompt" | "ruleId" | "acceptedAnswers">;

export interface GenerateRequest {
  topic: Topic;
  types: ExerciseType[];
  count: number;
  /** For review: one exercise per listed rule, in this order. */
  ruleIds?: string[];
}

export interface CheckVerdict {
  correct: boolean;
  explanation: string;
}

const useMock = () => process.env.MOCK_AI === "1";

/** Reads the uploaded material (text and/or images) into a titled topic with its rules. */
export async function readTopic(input: TopicInput): Promise<TopicDraft> {
  if (useMock()) return mock.readTopic(input);

  const parts: ContentPart[] = [];
  if (input.text) parts.push({ type: "text", text: `Material:\n${input.text}` });
  for (const url of input.imageDataUrls ?? []) parts.push({ type: "image_url", image_url: { url } });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You prepare study material for a language learner whose own language is ${input.fromLang} and who is learning ${input.toLang}.
Read the material (text, images of textbook pages or notes, or just a short request naming a topic) and return JSON:
{
  "title": "short topic title in ${input.toLang}",
  "sourceText": "the material as plain text. For images, transcribe all relevant text faithfully. For a short request, write a concise study summary of that topic with rules and examples.",
  "rules": ["each distinct rule or usage pattern the material teaches, one short sentence each, written in ${input.fromLang}, with a ${input.toLang} example"]
}
Keep 2 to 8 rules. Return only the JSON object.`,
    },
    { role: "user", content: parts },
  ];
  const draft = await chatJson<TopicDraft>(messages);
  if (!draft.title || !Array.isArray(draft.rules) || draft.rules.length === 0) {
    throw new Error("The model could not find a topic in this material");
  }
  return { title: draft.title, sourceText: draft.sourceText ?? input.text ?? "", rules: draft.rules };
}

const TYPE_GUIDE: Record<ExerciseType, (t: Topic) => string> = {
  translate: (t) =>
    `"translate": prompt is a sentence in ${t.fromLang}; acceptedAnswers are correct ${t.toLang} translations (include every natural variant: word order, optional pronouns, synonyms).`,
  fill_gap: (t) =>
    `"fill_gap": prompt is a ${t.toLang} sentence with one gap written as ___ and the base form in parentheses after it, e.g. "Quizá ___ (tener) razón."; acceptedAnswers are the missing word(s) alone, plus the full completed sentence.`,
  pick_mood: (t) =>
    `"pick_mood": prompt is a ${t.toLang} sentence with one gap ___ followed by 2-3 candidate forms in parentheses separated by " / ", e.g. "A lo mejor mañana ___ (llueve / llueva)."; the candidates must test the rule (e.g. indicative vs subjunctive); acceptedAnswers are the correct candidate alone, plus the full completed sentence.`,
  fix_error: (t) =>
    `"fix_error": prompt is a ${t.toLang} sentence containing exactly one mistake against the rule; acceptedAnswers are the fully corrected sentence (and acceptable variants).`,
};

/** Generates a batch of exercises with their accepted answers, mixing the requested types. */
export async function generateExercises(req: GenerateRequest): Promise<GeneratedExercise[]> {
  const { topic, types } = req;
  const raw = useMock()
    ? mock.generateExercises(req)
    : await chatJson<{ exercises: GeneratedExercise[] }>(buildGenerateMessages(req)).then((r) => r.exercises);
  return sanitizeExercises(raw ?? [], topic, types, req.ruleIds?.length ?? req.count, req.ruleIds);
}

function buildGenerateMessages(req: GenerateRequest): ChatMessage[] {
  const { topic, types, count, ruleIds } = req;
  const rules = topic.rules.map((r) => `- ${r.id}: ${r.text}`).join("\n");
  const plan = ruleIds
    ? `Write exactly ${ruleIds.length} exercises, one per rule in this order: ${ruleIds.join(", ")}. Each must use a new sentence, not one from the material. Pick any of the allowed types for each.`
    : `Write exactly ${count} exercises. Spread them evenly over the allowed types and over the rules, and vary the sentences.`;
  return [
    {
      role: "system",
      content: `You write exercises for a learner whose own language is ${topic.fromLang} and who is learning ${topic.toLang}.
Topic: ${topic.title}

Rules (id: text):
${rules}

Material:
${topic.sourceText}

Allowed exercise types:
${types.map((t) => TYPE_GUIDE[t](topic)).join("\n")}

${plan}
Each exercise has "instruction": one short line in ${topic.fromLang} telling the learner what to do, and "ruleId": the id of the rule it practises.
acceptedAnswers must be complete and correct, since answers are checked against them exactly. Do not reveal the answer in the prompt or instruction.
Return JSON: {"exercises": [{"type": "...", "instruction": "...", "prompt": "...", "ruleId": "...", "acceptedAnswers": ["..."]}]}`,
    },
    { role: "user", content: "Generate the exercises now." },
  ];
}

/** Drops malformed exercises and pins type and rule ids to known values. */
export function sanitizeExercises(
  raw: GeneratedExercise[],
  topic: Topic,
  types: ExerciseType[],
  limit: number,
  ruleIds?: string[],
): GeneratedExercise[] {
  const ruleSet = new Set(topic.rules.map((r) => r.id));
  const out = raw
    .map((e, i) => {
      if (!e || typeof e.prompt !== "string" || !e.prompt.trim()) return undefined;
      const answers = (Array.isArray(e.acceptedAnswers) ? e.acceptedAnswers : [])
        .filter((a): a is string => typeof a === "string" && a.trim() !== "")
        .map((a) => a.trim());
      const type = EXERCISE_TYPES.includes(e.type) && types.includes(e.type) ? e.type : types[0];
      const expectedRule = ruleIds?.[i];
      const ruleId = expectedRule ?? (ruleSet.has(e.ruleId) ? e.ruleId : topic.rules[0].id);
      return {
        type,
        instruction: (e.instruction ?? "").trim(),
        prompt: e.prompt.trim(),
        ruleId,
        acceptedAnswers: answers,
      };
    })
    .filter((e): e is GeneratedExercise => e !== undefined && e.acceptedAnswers.length > 0);
  return out.slice(0, limit);
}

/** Second opinion when an answer doesn't match any accepted answer exactly. */
export async function checkAnswer(exercise: Exercise, topic: Topic, answer: string): Promise<CheckVerdict> {
  if (useMock()) return mock.checkAnswer(exercise, answer);

  const rule = topic.rules.find((r) => r.id === exercise.ruleId)?.text ?? "";
  const verdict = await chatJson<CheckVerdict>([
    {
      role: "system",
      content: `You check a ${topic.toLang} exercise answer for a learner whose own language is ${topic.fromLang}.
Exercise instruction: ${exercise.instruction}
Exercise: ${exercise.prompt}
Rule practised: ${rule}
Known correct answers: ${JSON.stringify(exercise.acceptedAnswers)}

The learner's answer did not match the known answers exactly. Decide whether it is still correct.
Count it as correct if it is a valid alternative, or if it only has small slips (a typo, a missing accent, punctuation) that don't affect the grammar point being practised.
Count it as wrong if the form the exercise tests is wrong, or the meaning is wrong.
If wrong, "explanation" is at most two short sentences in ${topic.fromLang}: what is wrong and which rule applies. If correct, "explanation" is "".
Return JSON: {"correct": true|false, "explanation": "..."}`,
    },
    { role: "user", content: answer },
  ]);
  return { correct: Boolean(verdict.correct), explanation: verdict.explanation ?? "" };
}
