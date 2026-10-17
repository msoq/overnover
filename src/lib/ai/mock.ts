// Canned AI responses for MOCK_AI=1, so the app can be clicked through without an API key.
import type { Exercise } from "../types";
import type { CheckVerdict, GeneratedExercise, GenerateRequest, TopicDraft, TopicInput } from "./index";

export function readTopic(input: TopicInput): TopicDraft {
  return {
    title: "Presente de subjuntivo (mock)",
    sourceText: input.text ?? "(image)",
    rules: [
      "Wishes with que take the subjunctive: ¡Que llegue a tiempo!",
      "Quizá, tal vez, acaso and puede que take the subjunctive: Quizá tenga razón.",
      "A lo mejor takes the indicative: A lo mejor viene mañana.",
    ],
  };
}

const SAMPLES: GeneratedExercise[] = [
  { type: "translate", instruction: "Translate", prompt: "Пусть он придёт вовремя!", ruleId: "r1", acceptedAnswers: ["¡Que llegue a tiempo!"] },
  { type: "fill_gap", instruction: "Fill the gap", prompt: "Quizá ___ (tener) razón.", ruleId: "r2", acceptedAnswers: ["tenga", "Quizá tenga razón."] },
  { type: "pick_mood", instruction: "Pick the right form", prompt: "A lo mejor mañana ___ (llueve / llueva).", ruleId: "r3", acceptedAnswers: ["llueve", "A lo mejor mañana llueve."] },
  { type: "fix_error", instruction: "Fix the mistake", prompt: "Tal vez sabe la respuesta.", ruleId: "r2", acceptedAnswers: ["Tal vez sepa la respuesta."] },
];

export function generateExercises(req: GenerateRequest): GeneratedExercise[] {
  const pool = SAMPLES.filter((s) => req.types.includes(s.type));
  const n = req.ruleIds?.length ?? req.count;
  return Array.from({ length: n }, (_, i) => {
    const s = pool[i % pool.length];
    return { ...s, ruleId: req.ruleIds?.[i] ?? req.topic.rules[i % req.topic.rules.length].id };
  });
}

export function checkAnswer(exercise: Exercise, answer: string): CheckVerdict {
  if (answer.trim().toLowerCase() === "ok") return { correct: true, explanation: "" };
  return { correct: false, explanation: `Expected "${exercise.acceptedAnswers[0]}" for this rule (mock feedback).` };
}
