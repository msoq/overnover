// Google sign-in in the browser (Google Identity Services token flow). The access
// token lets the browser read and write the user's own progress sheet directly.
import { GOOGLE_CLIENT_ID } from "./config";

const SCOPES = "openid email https://www.googleapis.com/auth/drive.file";
const HINT_KEY = "overnover.google.email";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken(options?: { prompt?: string; login_hint?: string }): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (r: TokenResponse) => void;
            error_callback?: (e: { type: string }) => void;
          }): TokenClient;
          revoke(token: string, done: () => void): void;
        };
      };
    };
  }
}

let scriptLoad: Promise<void> | undefined;
let token: { value: string; expiresAt: number } | undefined;

function loadScript(): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Google sign-in"));
    document.head.appendChild(s);
  });
  return scriptLoad;
}

function storedEmail(): string | undefined {
  try {
    return localStorage.getItem(HINT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** True when this browser signed in before, so a silent token request is worth trying. */
export function hasSignedInBefore(): boolean {
  return Boolean(storedEmail());
}

/**
 * Returns a valid access token. `interactive` must come from a click: Google
 * may show its consent popup. Without it, only a silent refresh is attempted.
 */
export async function getAccessToken(interactive = false): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  await loadScript();
  const google = window.google;
  if (!google) throw new Error("Google sign-in is unavailable");

  const response = await new Promise<TokenResponse>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: resolve,
      error_callback: (e) =>
        reject(new Error(e.type === "popup_closed" ? "Sign-in was cancelled" : "Sign-in needed")),
    });
    client.requestAccessToken({ prompt: interactive ? "" : "none", login_hint: storedEmail() });
  });
  if (!response.access_token) throw new Error(response.error ?? "Sign-in needed");
  token = { value: response.access_token, expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000 };

  const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.value}` },
  }).then((r) => r.json() as Promise<{ email?: string }>);
  try {
    if (info.email) localStorage.setItem(HINT_KEY, info.email);
  } catch {
    // Only a sign-in hint; fine to lose.
  }
  return token.value;
}

export function currentEmail(): string | undefined {
  return storedEmail();
}

export function signOut(): void {
  if (token && window.google) window.google.accounts.oauth2.revoke(token.value, () => {});
  token = undefined;
  try {
    localStorage.removeItem(HINT_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Calls a Google API with the current token. */
export async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const access = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Google request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res;
}
