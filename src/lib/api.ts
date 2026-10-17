"use client";

/** Calls one of the app's API routes and throws the server's error message on failure. */
export async function api<T>(path: string, init?: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body || init?.form ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.form ?? (init?.body ? JSON.stringify(init.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}
