// Google sign-in in the same tab (OAuth 2.0 implicit flow): the app redirects to
// Google, and Google redirects back to the site root with an access token in the
// URL fragment. The token lets the browser read and write the user's own progress
// sheet directly. It lasts about an hour; after that the user is sent through
// Google again, which is instant while their Google session is alive.
import { GOOGLE_CLIENT_ID } from "./config";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = "openid email https://www.googleapis.com/auth/drive.file";
const HINT_KEY = "overnover.google.email";
const TOKEN_KEY = "overnover.google.token";
const REQUEST_KEY = "overnover.google.request";
const SILENT_FAILED_KEY = "overnover.google.silentFailed";

interface StoredToken {
  value: string;
  expiresAt: number;
}

interface AuthRequest {
  state: string;
  returnTo: string;
  silent: boolean;
}

export type RedirectResult =
  | { kind: "none" }
  | { kind: "signed-in"; returnTo: string }
  | { kind: "failed"; returnTo: string; error?: string };

function read<T>(storage: () => Storage, key: string): T | undefined {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(storage: () => Storage, key: string, value: unknown): void {
  try {
    if (value === undefined) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or quota: sign-in still works for this page view.
  }
}

const session = () => sessionStorage;
const local = () => localStorage;

// Kept in memory too, so a page view works even when sessionStorage is unavailable.
let token: StoredToken | undefined;

function validToken(): StoredToken | undefined {
  token ??= read<StoredToken>(session, TOKEN_KEY);
  return token && token.expiresAt > Date.now() + 60_000 ? token : undefined;
}

function storedEmail(): string | undefined {
  return read<string>(local, HINT_KEY);
}

/** True when this browser signed in before, so a silent sign-in is worth trying. */
export function hasSignedInBefore(): boolean {
  return Boolean(storedEmail());
}

export function hasValidToken(): boolean {
  return Boolean(validToken());
}

/** A silent attempt already came back without a token in this tab; don't bounce again. */
export function silentSignInFailed(): boolean {
  return Boolean(read<boolean>(session, SILENT_FAILED_KEY));
}

/**
 * Leaves the page for Google's sign-in. With `silent`, Google shows nothing and
 * redirects straight back, with or without a token.
 */
export function startSignIn({ silent = false } = {}): void {
  const request: AuthRequest = {
    state: crypto.randomUUID(),
    returnTo: location.pathname + location.search,
    silent,
  };
  write(session, REQUEST_KEY, request);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${location.origin}/`,
    response_type: "token",
    scope: SCOPES,
    include_granted_scopes: "true",
    state: request.state,
    prompt: silent ? "none" : "select_account",
  });
  const hint = storedEmail();
  if (hint) params.set("login_hint", hint);
  location.assign(`${AUTH_URL}?${params}`);
}

let redirectResult: Promise<RedirectResult> | undefined;

/**
 * Picks up Google's answer from the URL fragment after a redirect back. Safe to
 * call more than once; the fragment is read only on the first call.
 */
export function completeSignIn(): Promise<RedirectResult> {
  redirectResult ??= readRedirect();
  return redirectResult;
}

async function readRedirect(): Promise<RedirectResult> {
  const fragment = new URLSearchParams(location.hash.slice(1));
  const request = read<AuthRequest>(session, REQUEST_KEY);
  if (!request || fragment.get("state") !== request.state) return { kind: "none" };
  write(session, REQUEST_KEY, undefined);
  const returnTo = request.returnTo || "/";

  const accessToken = fragment.get("access_token");
  if (!accessToken) {
    if (request.silent) write(session, SILENT_FAILED_KEY, true);
    const error = fragment.get("error");
    return {
      kind: "failed",
      returnTo,
      // A silent attempt that needs the user is expected, not an error to show.
      error: request.silent
        ? undefined
        : error === "access_denied"
          ? "Sign-in was cancelled"
          : "Sign-in failed",
    };
  }

  token = { value: accessToken, expiresAt: Date.now() + Number(fragment.get("expires_in") ?? 3600) * 1000 };
  write(session, TOKEN_KEY, token);
  write(session, SILENT_FAILED_KEY, undefined);

  // The email keys the per-user caches and is the hint for the next sign-in.
  const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
    .then((r) => r.json() as Promise<{ email?: string }>)
    .catch(() => ({ email: undefined }));
  if (info.email) write(local, HINT_KEY, info.email);
  return { kind: "signed-in", returnTo };
}

export function currentEmail(): string | undefined {
  return storedEmail();
}

export function signOut(): void {
  const current = validToken();
  if (current) {
    void fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(current.value)}`, {
      method: "POST",
      mode: "no-cors",
    }).catch(() => {});
  }
  token = undefined;
  write(session, TOKEN_KEY, undefined);
  write(local, HINT_KEY, undefined);
}

/** Calls a Google API with the current token. Throws when the user must sign in again. */
export async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const access = validToken();
  if (!access) throw new Error("Sign-in needed");
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${access.value}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Google request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res;
}
