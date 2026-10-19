import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import { Menu } from "./components/Menu";
import { STORAGE } from "./lib/config";
import { currentEmail } from "./lib/google";
import { ProgressProvider, useProgress } from "./lib/progress";
import "./styles.css";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Overnover</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ProgressProvider>
      <Header />
      <main>
        <Gate />
      </main>
    </ProgressProvider>
  );
}

export function HydrateFallback() {
  return <p className="muted center">Loading…</p>;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Something went wrong";
  return (
    <main>
      <h1>Something went wrong</h1>
      <p className="error">{message}</p>
      <a href="/">Back to start</a>
    </main>
  );
}

function Header() {
  const { status, saveError, retrySave, progress } = useProgress();
  const { pathname } = useLocation();
  // Practice and the new-topic steps have one job each, and with no topics yet the
  // home screen shows the same button; a second one would only distract.
  const showNew =
    status === "ready" && progress.topics.length > 0 && pathname !== "/practice" && pathname !== "/new";
  return (
    <header className="top">
      <Link to="/" className="brand">
        Overnover
      </Link>
      <div className="row">
        {saveError && (
          <button type="button" className="link error" onClick={() => void retrySave()} title={saveError}>
            Not saved. Retry
          </button>
        )}
        {showNew && (
          <Link to="/new" className="button primary">
            + New topic
          </Link>
        )}
        {status === "ready" && <AccountMenu />}
      </div>
    </header>
  );
}

function AccountMenu() {
  const email = STORAGE === "sheets" ? currentEmail() : undefined;
  return (
    <Menu label="Account" trigger={(email?.[0] ?? "☰").toUpperCase()}>
      {(close) => <AccountPanel email={email} close={close} />}
    </Menu>
  );
}

/** Mounted on open, so the language field starts from the current setting. */
function AccountPanel({ email, close }: { email?: string; close(): void }) {
  const { progress, updateSettings, signOut } = useProgress();
  const [language, setLanguage] = useState(progress.settings.language);
  return (
    <>
      {email && <p className="muted">{email}</p>}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (language.trim()) updateSettings({ language: language.trim() });
          close();
        }}
      >
        <label>
          Your language
          <input value={language} onChange={(e) => setLanguage(e.target.value)} />
        </label>
        <p className="muted small">Explanations and translation exercises use it.</p>
        <button type="submit" disabled={!language.trim() || language.trim() === progress.settings.language}>
          Save
        </button>
      </form>
      {STORAGE === "sheets" && (
        <button type="button" className="link" onClick={signOut}>
          Sign out
        </button>
      )}
    </>
  );
}

/** Everything below needs a loaded progress and the learner's language. */
function Gate() {
  const { status, error, signIn, progress } = useProgress();
  if (status === "starting" || status === "loading")
    return <p className="muted center">Loading your progress…</p>;
  if (status === "signed-out") {
    return (
      <section className="stack center">
        <h1>Learn from your own material</h1>
        <p className="muted">
          Upload notes, a worksheet or a screenshot and get exercises that check your answers. Your progress
          is kept in a spreadsheet in your own Google Drive.
        </p>
        <button type="button" className="primary" onClick={() => void signIn()}>
          Sign in with Google
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="stack">
        <p className="error">Couldn't load your progress: {error}</p>
        <button type="button" onClick={() => void signIn()}>
          Try again
        </button>
      </section>
    );
  }
  if (!progress.settings.language) return <GuessLanguage />;
  return <Outlet />;
}

function guessLanguage(): string {
  try {
    const code = navigator.language.split("-")[0];
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? "English";
  } catch {
    return "English";
  }
}

/** First visit: take the browser's language instead of asking; it can be changed in the account menu. */
function GuessLanguage() {
  const { updateSettings } = useProgress();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    updateSettings({ language: guessLanguage() });
  });
  return null;
}
