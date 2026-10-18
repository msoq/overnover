import { type ReactNode, useState } from "react";
import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
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
  const { status, saving, saveError, retrySave, signOut } = useProgress();
  return (
    <header className="top">
      <Link to="/" className="brand">
        Overnover
      </Link>
      <div className="row">
        {saving && <span className="muted">Saving…</span>}
        {saveError && (
          <button type="button" className="link error" onClick={() => void retrySave()} title={saveError}>
            Not saved. Retry
          </button>
        )}
        {STORAGE === "sheets" && status === "ready" && (
          <button type="button" className="link" onClick={signOut} title={currentEmail()}>
            Sign out
          </button>
        )}
      </div>
    </header>
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
  if (!progress.settings.language) return <LanguageSetup />;
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

function LanguageSetup() {
  const { updateSettings } = useProgress();
  const [language, setLanguage] = useState(guessLanguage);
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (language.trim()) updateSettings({ language: language.trim() });
      }}
    >
      <h1>Which language should I use with you?</h1>
      <p className="muted">Instructions and feedback will be written in it. You can change it later.</p>
      <input value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Your language" />
      <button type="submit" className="primary">
        Continue
      </button>
    </form>
  );
}
