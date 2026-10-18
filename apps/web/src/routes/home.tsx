import { isDue, type Topic } from "@overnover/core";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { readTopic } from "../lib/api";
import { prepareFiles } from "../lib/files";
import { useProgress } from "../lib/progress";
import { clearSession, loadSession } from "../lib/session";

export default function Home() {
  const { progress } = useProgress();
  const [session, setSession] = useState(loadSession);
  const open = progress.review.filter((r) => r.status === "open");
  const due = open.filter((r) => isDue(r));

  return (
    <div className="stack">
      {session && session.position < session.exercises.length && (
        <section className="card row spread">
          <span>
            Unfinished: {session.label} ({session.position}/{session.exercises.length})
          </span>
          <span className="row">
            <button
              type="button"
              className="link"
              onClick={() => {
                clearSession();
                setSession(undefined);
              }}
            >
              Discard
            </button>
            <Link to="/practice" className="button primary">
              Continue
            </Link>
          </span>
        </section>
      )}

      {open.length > 0 && (
        <section className="card row spread">
          <span>
            {due.length} due today, {open.length} mistakes to review
          </span>
          <span className="row">
            <Link to="/review?mode=due" className={`button${due.length ? " primary" : " disabled"}`}>
              Due today
            </Link>
            <Link to="/review?mode=all" className="button">
              Review my mistakes
            </Link>
          </span>
        </section>
      )}

      <NewTopic />

      {progress.topics.length > 0 && (
        <section className="stack">
          <h2>Your topics</h2>
          <ul className="list">
            {progress.topics.map((t) => (
              <li key={t.id}>
                <Link to={`/topics/${t.id}`}>{t.title}</Link>
                <span className="muted"> · {t.subject}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LanguageLine />
    </div>
  );
}

function NewTopic() {
  const { progress, addTopic } = useProgress();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const material = await prepareFiles(files);
      const read = await readTopic({
        language: progress.settings.language,
        text: [text, ...material.texts].filter((s) => s.trim()).join("\n\n") || undefined,
        files: material.files.length ? material.files : undefined,
        instructions: instructions.trim() || undefined,
      });
      const topic: Topic = {
        id: crypto.randomUUID(),
        title: read.title,
        subject: read.subject,
        kind: read.kind,
        targetLanguage: read.targetLanguage,
        instructions: read.instructions,
        rules: read.rules.map((r, i) => ({ id: `r${i + 1}`, text: r })),
        sourceText: read.sourceText,
        createdAt: new Date().toISOString(),
      };
      addTopic(topic);
      navigate(`/topics/${topic.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2>New topic</h2>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          const pasted = Array.from(e.clipboardData.files);
          if (pasted.length) {
            e.preventDefault();
            setFiles((prev) => [...prev, ...pasted]);
          }
        }}
        placeholder="Paste your notes or homework, describe what you want to practise, or paste a screenshot"
        aria-label="Material"
      />
      <label className="file">
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,image/*"
          onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
        />
        Add files (PDF, DOCX, TXT, images)
      </label>
      {files.length > 0 && (
        <ul className="chips">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`}>
              {f.name}
              <button
                type="button"
                className="link"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>Instructions for the AI (optional)</summary>
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="For example: I'm preparing for a B1 exam, focus on irregular verbs"
          aria-label="Instructions"
        />
      </details>
      <button type="submit" className="primary" disabled={busy || (!text.trim() && files.length === 0)}>
        {busy ? "Reading your material…" : "Create topic"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function LanguageLine() {
  const { progress, updateSettings } = useProgress();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(progress.settings.language);
  if (!editing) {
    return (
      <p className="muted">
        Feedback language: {progress.settings.language}{" "}
        <button type="button" className="link" onClick={() => setEditing(true)}>
          Change
        </button>
      </p>
    );
  }
  return (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) updateSettings({ language: value.trim() });
        setEditing(false);
      }}
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} aria-label="Feedback language" />
      <button type="submit">Save</button>
    </form>
  );
}
