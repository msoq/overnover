export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

/** Without a Google client ID, progress stays in this browser (handy for local development). */
export const STORAGE: "sheets" | "local" = GOOGLE_CLIENT_ID ? "sheets" : "local";
