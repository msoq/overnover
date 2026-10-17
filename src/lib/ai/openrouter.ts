export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user";
  content: string | ContentPart[];
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** Pulls the JSON object out of a model reply, tolerating code fences or stray prose. */
export function parseJsonReply<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`Model reply had no JSON object: ${text.slice(0, 200)}`);
  return JSON.parse(body.slice(start, end + 1)) as T;
}

/** Sends a chat request through OpenRouter and returns the reply parsed as JSON. */
export async function chatJson<T>(messages: ChatMessage[]): Promise<T> {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!key || !model) throw new Error("Set OPENROUTER_API_KEY and OPENROUTER_MODEL in .env.local");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Title": "overnover",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter request failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty reply");
  return parseJsonReply<T>(content);
}
