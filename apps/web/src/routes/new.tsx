import type { ExerciseType, Topic } from "@overnover/core";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { StartCard } from "../components/StartCard";
import { readTopic } from "../lib/api";
import { prepareFiles } from "../lib/files";
import { useProgress } from "../lib/progress";
import { useStartSession } from "../lib/start";

/**
 * New topic in three steps: describe or upload, check what was understood, practise.
 * The topic is saved only when practice starts, so abandoning the flow leaves nothing behind.
 */
export default function NewTopic() {
  const { progress, addTopic } = useProgress();
  const startSession = useStartSession();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<Topic>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const addFiles = (list: FileList | File[] | null) => {
    const added = Array.from(list ?? []);
    if (added.length) setFiles((prev) => [...prev, ...added]);
  };

  async function read() {
    setBusy(true);
    setError(undefined);
    try {
      const material = await prepareFiles(files);
      const result = await readTopic({
        language: progress.settings.language,
        text: [text, ...material.texts].filter((s) => s.trim()).join("\n\n") || undefined,
        files: material.files.length ? material.files : undefined,
      });
      setDraft({
        id: crypto.randomUUID(),
        title: result.title,
        subject: result.subject,
        kind: result.kind,
        targetLanguage: result.targetLanguage,
        instructions: result.instructions,
        rules: result.rules.map((r, i) => ({ id: `r${i + 1}`, text: r })),
        sourceText: result.sourceText,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function start(topic: Topic, types: ExerciseType[], count: number) {
    setBusy(true);
    setError(undefined);
    try {
      await startSession(topic, types, count);
      addTopic(topic);
      navigate("/practice");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (draft) {
    return (
      <div className="stack">
        <p className="muted">Step 2 of 3</p>
        <h1>{draft.title}</h1>
        <StartCard topic={draft} busy={busy} error={error} onStart={(t, c) => void start(draft, t, c)}>
          <button
            type="button"
            className="link"
            onClick={() => {
              setDraft(undefined);
              setError(undefined);
            }}
          >
            Not right? Change the description
          </button>
        </StartCard>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row spread">
        <Link to="/" className="muted">
          ← Back
        </Link>
        <span className="muted">Step 1 of 3</span>
      </div>
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          void read();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <h1>What are you learning?</h1>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          placeholder="For example: Spanish subjunctive after quizá, B1. Or paste your notes, a screenshot, or drop a file here."
          aria-label="What you're learning"
          // biome-ignore lint/a11y/noAutofocus: the field is the only thing on this step
          autoFocus
        />
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
        <div className="row spread">
          <label className="attach">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,image/*"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            📎 Attach a file
          </label>
          <button type="submit" className="primary" disabled={busy || (!text.trim() && files.length === 0)}>
            {busy ? "Reading…" : "Continue"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
