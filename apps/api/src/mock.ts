// Canned AI responses for MOCK_AI=1, so the app can be tried and tested without an API key.
import type {
  CheckRequest,
  CheckResponse,
  Exercise,
  ExerciseType,
  GenerateRequest,
  ReadTopicRequest,
  ReadTopicResponse,
} from "@overnover/core";

type Sample = Omit<Exercise, "id" | "topicId" | "ruleId">;

const SAMPLES: Record<ExerciseType, Sample> = {
  translate: {
    type: "translate",
    instruction: "Translate",
    prompt: "Пусть он придёт вовремя!",
    acceptedAnswers: ["¡Que llegue a tiempo!"],
  },
  fill_gap: {
    type: "fill_gap",
    instruction: "Fill the gap",
    prompt: "Quizá ___ (tener) razón.",
    acceptedAnswers: ["tenga", "Quizá tenga razón."],
  },
  pick_form: {
    type: "pick_form",
    instruction: "Pick the right form",
    prompt: "A lo mejor mañana ___ (llueve / llueva).",
    acceptedAnswers: ["llueve", "A lo mejor mañana llueve."],
  },
  fix_error: {
    type: "fix_error",
    instruction: "Fix the mistake",
    prompt: "Tal vez sabe la respuesta.",
    acceptedAnswers: ["Tal vez sepa la respuesta."],
  },
  short_answer: {
    type: "short_answer",
    instruction: "Answer briefly",
    prompt: "Which organelle produces most of the cell's ATP?",
    acceptedAnswers: ["mitochondria", "the mitochondria"],
  },
  true_false: {
    type: "true_false",
    instruction: "True or false?",
    prompt: "Plant cells have no cell membrane.",
    acceptedAnswers: ["false"],
  },
};

export function readTopic(req: ReadTopicRequest): ReadTopicResponse {
  const general = /biolog|history|math/i.test(`${req.instructions ?? ""} ${req.text ?? ""}`);
  return general
    ? {
        title: "Cell structure (mock)",
        subject: "Cell biology",
        kind: "general",
        instructions: req.instructions || "Short questions on cell organelles.",
        rules: ["Mitochondria produce ATP.", "Plant cells have a membrane and a wall."],
        sourceText: req.text ?? "",
      }
    : {
        title: "Presente de subjuntivo (mock)",
        subject: "Spanish grammar",
        kind: "language",
        targetLanguage: "Spanish",
        instructions: req.instructions || "Practise the present subjunctive after que and quizá.",
        rules: [
          "Wishes with que take the subjunctive: ¡Que llegue a tiempo!",
          "Quizá, tal vez and acaso take the subjunctive: Quizá tenga razón.",
          "A lo mejor takes the indicative: A lo mejor viene mañana.",
        ],
        sourceText: req.text ?? "(file)",
      };
}

export function generateExercises(req: GenerateRequest): Omit<Exercise, "id" | "topicId">[] {
  const n = req.ruleIds?.length ?? req.count;
  return Array.from({ length: n }, (_, i) => {
    const sample = SAMPLES[req.types[i % req.types.length]];
    // A tag keeps prompts unique, so mastered exercises don't filter the whole mock batch away.
    const tag = crypto.randomUUID().slice(0, 4);
    return {
      ...sample,
      prompt: `${sample.prompt} [${tag}]`,
      ruleId: req.ruleIds?.[i] ?? req.topic.rules[i % req.topic.rules.length].id,
    };
  });
}

export function checkAnswer(req: CheckRequest): CheckResponse {
  const answer = req.answer.trim().toLowerCase();
  if (answer === "ok") return { correct: true };
  if (answer === "typo") return { correct: true, corrected: req.exercise.acceptedAnswers[0] };
  return {
    correct: false,
    explanation: `This rule needs "${req.exercise.acceptedAnswers[0]}" (mock feedback).`,
  };
}
