import type { Exercise, GenerateResponse, ReadTopicResponse } from "@overnover/core";
import { describe, expect, it } from "vitest";
import { sanitizeExercises } from "./ai";
import { app } from "./index";
import { parseJsonReply } from "./openrouter";

const env = { OPENROUTER_MODEL: "test", MOCK_AI: "1", WEB_ORIGIN: "http://localhost:5173" };
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(
    path,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...headers },
    },
    env,
  );

describe("API", () => {
  it("reads a topic, generates exercises and checks an answer", async () => {
    const topicRes = await post("/api/topics/read", { language: "Russian", text: "subjuntivo notes" });
    expect(topicRes.status).toBe(200);
    const draft = (await topicRes.json()) as ReadTopicResponse;
    expect(draft.kind).toBe("language");

    const topic = { id: "t1", ...draft, rules: draft.rules.map((text, i) => ({ id: `r${i + 1}`, text })) };
    const gen = await post("/api/exercises", {
      language: "Russian",
      topic,
      types: ["fill_gap", "translate"],
      count: 3,
    });
    const { exercises } = (await gen.json()) as GenerateResponse;
    expect(exercises).toHaveLength(3);
    expect(exercises[0].topicId).toBe("t1");

    const check = await post("/api/check", {
      language: "Russian",
      topic,
      exercise: exercises[0],
      answer: "nope",
    });
    expect(await check.json()).toMatchObject({ correct: false });
  });

  it("rejects requests without material or with unsupported files", async () => {
    expect((await post("/api/topics/read", { language: "Russian" })).status).toBe(400);
    const res = await post("/api/topics/read", {
      language: "Russian",
      files: [{ name: "a.docx", mimeType: "application/msword", data: "AAAA" }],
    });
    expect(res.status).toBe(400);
  });

  it("allows CORS only from the configured origin", async () => {
    const ok = await app.request(
      "/api/check",
      {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "POST" },
      },
      env,
    );
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
    const no = await app.request(
      "/api/check",
      {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" },
      },
      env,
    );
    expect(no.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("helpers", () => {
  it("parses JSON in fences or prose", () => {
    expect(parseJsonReply<{ a: number }>('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(parseJsonReply<{ a: number }>('sure {"a": 2}')).toEqual({ a: 2 });
  });

  it("drops broken exercises and pins types and rules", () => {
    const topic = {
      id: "t",
      title: "",
      subject: "",
      kind: "general" as const,
      instructions: "",
      sourceText: "",
      rules: [
        { id: "r1", text: "" },
        { id: "r2", text: "" },
      ],
    };
    const raw: Partial<Exercise>[] = [
      { type: "translate", prompt: "q", ruleId: "r9", acceptedAnswers: ["a"] },
      { type: "true_false", prompt: "", acceptedAnswers: ["a"] },
      { type: "true_false", prompt: "q2", ruleId: "r2", acceptedAnswers: [] },
      { type: "true_false", prompt: "q3", ruleId: "r2", acceptedAnswers: ["false"] },
    ];
    const out = sanitizeExercises(raw, {
      language: "English",
      topic,
      types: ["short_answer", "true_false"],
      count: 10,
    });
    expect(out.map((e) => [e.type, e.ruleId])).toEqual([
      ["short_answer", "r1"],
      ["true_false", "r2"],
    ]);
  });
});
