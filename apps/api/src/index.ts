import type { CheckRequest, GenerateRequest, ReadTopicRequest } from "@overnover/core";
import { EXERCISE_TYPES } from "@overnover/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { type AiEnv, checkAnswer, generateExercises, readTopic } from "./ai";

type Env = AiEnv & { WEB_ORIGIN: string };

const MAX_FILE_BYTES = 15 * 1024 * 1024;
/** Matches the per-topic cap on mastered exercises, with room for older clients. */
const MAX_AVOID = 60;

export const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
  const allowed = c.env.WEB_ORIGIN.split(",").map((o) => o.trim());
  return cors({ origin: (origin) => (allowed.includes(origin) ? origin : null), maxAge: 86400 })(c, next);
});

function bad(message: string): never {
  throw new HTTPException(400, { message });
}

app.get("/health", (c) => c.json({ ok: true }));

app.post("/api/topics/read", async (c) => {
  const body = await c.req.json<ReadTopicRequest>();
  if (!body.language) bad("Choose your language first");
  const files = body.files ?? [];
  if (!body.text?.trim() && files.length === 0 && !body.instructions?.trim()) {
    bad("Add a file, a screenshot or a text prompt");
  }
  for (const f of files) {
    if (!/^(image\/|application\/pdf$)/.test(f.mimeType)) bad(`Unsupported file type: ${f.name}`);
    if ((f.data.length * 3) / 4 > MAX_FILE_BYTES) bad(`${f.name} is larger than 15 MB`);
  }
  return c.json(await readTopic(c.env, body));
});

app.post("/api/exercises", async (c) => {
  const body = await c.req.json<GenerateRequest>();
  if (!body.topic?.rules?.length) bad("Missing topic");
  const allowed: readonly string[] = EXERCISE_TYPES[body.topic.kind] ?? [];
  body.types = (body.types ?? []).filter((t) => allowed.includes(t));
  if (body.types.length === 0) bad("Pick at least one exercise type");
  if (!body.ruleIds && (!Number.isInteger(body.count) || body.count < 1 || body.count > 50)) {
    bad("Count must be between 1 and 50");
  }
  body.avoid = (Array.isArray(body.avoid) ? body.avoid : [])
    .filter((a) => typeof a?.prompt === "string" && typeof a.answer === "string")
    .slice(-MAX_AVOID);
  return c.json({ exercises: await generateExercises(c.env, body) });
});

app.post("/api/check", async (c) => {
  const body = await c.req.json<CheckRequest>();
  if (!body.exercise || typeof body.answer !== "string" || !body.answer.trim()) bad("Type an answer first");
  return c.json(await checkAnswer(c.env, body));
});

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: err.message || "Something went wrong" }, 500);
});

export default app;
