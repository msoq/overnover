import type {
  CheckRequest,
  CheckResponse,
  GenerateRequest,
  GenerateResponse,
  ReadTopicRequest,
  ReadTopicResponse,
} from "@overnover/core";
import { API_URL } from "./config";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const readTopic = (req: ReadTopicRequest) => post<ReadTopicResponse>("/api/topics/read", req);
export const generateExercises = (req: GenerateRequest) =>
  post<GenerateResponse>("/api/exercises", req).then((r) => r.exercises);
export const checkAnswer = (req: CheckRequest) => post<CheckResponse>("/api/check", req);
