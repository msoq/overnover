import {
  type CheckRequest,
  type CheckResponse,
  EXERCISE_TYPES,
  type Exercise,
  type ExerciseType,
  type GenerateRequest,
  type ReadTopicRequest,
  type ReadTopicResponse,
} from "@overnover/core";
import * as mock from "./mock";
import { type ChatMessage, type ContentPart, chatJson } from "./openrouter";

export interface AiEnv {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL: string;
  MOCK_AI?: string;
}

const useMock = (env: AiEnv) => env.MOCK_AI === "1";
const call = <T>(env: AiEnv, messages: ChatMessage[]) =>
  chatJson<T>(env.OPENROUTER_API_KEY ?? "", env.OPENROUTER_MODEL, messages);

/** Topic instructions as a block the model treats as the learner's own guidance. */
function instructionsBlock(instructions: string): string {
  return instructions.trim()
    ? `The learner's instructions for this topic (follow them for exercise style and focus):\n${instructions.trim()}`
    : "";
}

/** Reads the material (text, PDFs, images) into a topic: subject, kind, rules and extracted text. */
export async function readTopic(env: AiEnv, req: ReadTopicRequest): Promise<ReadTopicResponse> {
  if (useMock(env)) return mock.readTopic(req);

  const parts: ContentPart[] = [];
  if (req.text) parts.push({ type: "text", text: `Material:\n${req.text}` });
  for (const f of req.files ?? []) {
    const url = `data:${f.mimeType};base64,${f.data}`;
    if (f.mimeType.startsWith("image/")) parts.push({ type: "image_url", image_url: { url } });
    else parts.push({ type: "file", file: { filename: f.name, file_data: url } });
  }
  if (parts.length === 0) parts.push({ type: "text", text: "(no material, use the instructions)" });

  const draft = await call<Partial<ReadTopicResponse>>(env, [
    {
      role: "system",
      content: `You prepare study material for a learner whose own language is ${req.language}.
Read the material (text, documents, photos or screenshots of textbook pages or notes, or just a short request naming a topic).
${instructionsBlock(req.instructions ?? "")}

Return JSON:
{
  "title": "short topic title",
  "subject": "what is being learned, e.g. 'Spanish grammar' or 'Cell biology'",
  "kind": "language" if the topic is about learning a foreign language, otherwise "general",
  "targetLanguage": "for language topics only: the language being learned, in English, e.g. 'Spanish'",
  "instructions": "${req.instructions?.trim() ? "repeat the learner's instructions unchanged" : `one or two sentences, in ${req.language}, describing what the learner studies and how exercises should test it`}",
  "rules": ["each distinct rule, fact group or concept the material teaches, one short sentence each, in ${req.language}, with an example"],
  "sourceText": "the material as plain text. For images and documents, transcribe the relevant text faithfully. For a short request, write a concise study summary with rules and examples."
}
Keep 2 to 8 rules. Return only the JSON object.`,
    },
    { role: "user", content: parts },
  ]);

  if (!draft.title || !Array.isArray(draft.rules) || draft.rules.length === 0) {
    throw new Error("Couldn't find a topic in this material");
  }
  const kind = draft.kind === "language" ? "language" : "general";
  return {
    title: draft.title,
    subject: draft.subject ?? draft.title,
    kind,
    targetLanguage: kind === "language" ? draft.targetLanguage : undefined,
    instructions: req.instructions?.trim() || draft.instructions || "",
    rules: draft.rules.map(String),
    sourceText: (draft.sourceText ?? req.text ?? "").slice(0, 40_000),
  };
}

type TopicForAi = GenerateRequest["topic"];

const TYPE_GUIDE: Record<ExerciseType, (t: TopicForAi, language: string) => string> = {
  translate: (t, l) =>
    `"translate": prompt is a sentence in ${l}; acceptedAnswers are correct ${t.targetLanguage} translations (every natural variant: word order, optional pronouns, synonyms).`,
  fill_gap: (t) =>
    `"fill_gap": prompt is a sentence${t.kind === "language" ? ` in ${t.targetLanguage}` : ""} with one gap written as ___${t.kind === "language" ? ' and the base form in parentheses after it, e.g. "Quizá ___ (tener) razón."' : ""}; acceptedAnswers are the missing word(s) alone, plus the full completed sentence.`,
  pick_form: (t) =>
    `"pick_form": prompt is a ${t.targetLanguage} sentence with one gap ___ followed by 2-3 candidate forms in parentheses separated by " / ", e.g. "A lo mejor mañana ___ (llueve / llueva)."; candidates must test the rule; acceptedAnswers are the correct candidate alone, plus the full completed sentence.`,
  fix_error: () =>
    `"fix_error": prompt is a statement or sentence containing exactly one mistake against the rule; acceptedAnswers are the fully corrected version (and acceptable variants).`,
  short_answer: (_t, l) =>
    `"short_answer": prompt is a question with a short, unambiguous answer of one to a few words; acceptedAnswers list every acceptable wording, in ${l} unless the answer is a term or name.`,
  true_false: (_t, l) =>
    `"true_false": prompt is a statement that is clearly true or false; acceptedAnswers are the words for true or false in English and in ${l} (e.g. ["false", "ложь", "неверно"]).`,
};

function buildGenerateMessages(req: GenerateRequest): ChatMessage[] {
  const { topic, types, count, ruleIds, language } = req;
  const rules = topic.rules.map((r) => `- ${r.id}: ${r.text}`).join("\n");
  const plan = ruleIds
    ? `Write exactly ${ruleIds.length} exercises, one per rule in this order: ${ruleIds.join(", ")}. Each must use new content, not an example from the material. Pick any allowed type for each.`
    : `Write exactly ${count} exercises. Spread them evenly over the allowed types and the rules, and vary the content.`;
  return [
    {
      role: "system",
      content: `You write exercises for a learner whose own language is ${language}.
Topic: ${topic.title} (${topic.subject})
${instructionsBlock(topic.instructions)}

Rules (id: text):
${rules}

Material:
${topic.sourceText}

Allowed exercise types:
${types.map((t) => TYPE_GUIDE[t](topic, language)).join("\n")}

${plan}
Each exercise has "instruction": one short line in ${language} telling the learner what to do, and "ruleId": the id of the rule it practises.
acceptedAnswers must be complete and correct, since answers are checked against them exactly. Never reveal the answer in the prompt or instruction.
Return JSON: {"exercises": [{"type": "...", "instruction": "...", "prompt": "...", "ruleId": "...", "acceptedAnswers": ["..."]}]}`,
    },
    { role: "user", content: "Generate the exercises now." },
  ];
}

type RawExercise = Partial<Omit<Exercise, "id" | "topicId">>;

/** Drops malformed exercises and pins type and rule ids to known values. */
export function sanitizeExercises(raw: RawExercise[], req: GenerateRequest): Exercise[] {
  const { topic, types, ruleIds } = req;
  const allowed = new Set<string>(EXERCISE_TYPES[topic.kind]);
  const ruleSet = new Set(topic.rules.map((r) => r.id));
  const limit = ruleIds?.length ?? req.count;
  return raw
    .map((e, i): Exercise | undefined => {
      if (!e || typeof e.prompt !== "string" || !e.prompt.trim()) return undefined;
      const acceptedAnswers = (Array.isArray(e.acceptedAnswers) ? e.acceptedAnswers : [])
        .filter((a): a is string => typeof a === "string" && a.trim() !== "")
        .map((a) => a.trim());
      if (acceptedAnswers.length === 0) return undefined;
      const type = e.type && types.includes(e.type) && allowed.has(e.type) ? e.type : types[0];
      const ruleId = ruleIds?.[i] ?? (e.ruleId && ruleSet.has(e.ruleId) ? e.ruleId : topic.rules[0].id);
      return {
        id: crypto.randomUUID(),
        topicId: topic.id,
        type,
        instruction: (e.instruction ?? "").trim(),
        prompt: e.prompt.trim(),
        ruleId,
        acceptedAnswers,
      };
    })
    .filter((e): e is Exercise => e !== undefined)
    .slice(0, limit);
}

export async function generateExercises(env: AiEnv, req: GenerateRequest): Promise<Exercise[]> {
  const raw = useMock(env)
    ? mock.generateExercises(req)
    : (await call<{ exercises?: RawExercise[] }>(env, buildGenerateMessages(req))).exercises;
  return sanitizeExercises(raw ?? [], req);
}

/** Second opinion when an answer doesn't match any accepted answer. */
export async function checkAnswer(env: AiEnv, req: CheckRequest): Promise<CheckResponse> {
  if (useMock(env)) return mock.checkAnswer(req);
  const { topic, exercise, answer, language } = req;
  const rule = topic.rules.find((r) => r.id === exercise.ruleId)?.text ?? "";
  const verdict = await call<{ correct?: boolean; corrected?: string; explanation?: string }>(env, [
    {
      role: "system",
      content: `You check an exercise answer for a learner whose own language is ${language}.
Topic: ${topic.subject}
${instructionsBlock(topic.instructions)}
Exercise instruction: ${exercise.instruction}
Exercise: ${exercise.prompt}
Rule practised: ${rule}
Known correct answers: ${JSON.stringify(exercise.acceptedAnswers)}

The learner's answer did not match the known answers. Decide whether it is still correct.
Correct: a valid alternative, or an answer with only small slips (a typo, a missing accent, punctuation) that don't affect what the exercise tests.
Wrong: the thing the exercise tests is wrong, or the meaning is wrong.
If correct with slips, "corrected" is the learner's answer with the slips fixed; otherwise omit it.
If wrong, "explanation" is at most two short sentences in ${language}: what is wrong and which rule applies.
Return JSON: {"correct": true|false, "corrected": "...", "explanation": "..."}`,
    },
    { role: "user", content: answer },
  ]);
  const correct = Boolean(verdict.correct);
  const corrected = verdict.corrected?.trim();
  return correct
    ? { correct, corrected: corrected && corrected !== answer.trim() ? corrected : undefined }
    : { correct, explanation: verdict.explanation ?? "" };
}
