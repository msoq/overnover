import type { ExerciseType, Topic } from "@overnover/core";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { SessionOptions } from "../components/SessionOptions";
import { generateExercises } from "../lib/api";
import { useProgress } from "../lib/progress";
import { saveSession } from "../lib/session";

export default function TopicPage() {
  const { id } = useParams();
  const { progress } = useProgress();
  const topic = progress.topics.find((t) => t.id === id);
  if (!topic) {
    return (
      <p>
        This topic doesn't exist any more. <Link to="/">Back</Link>
      </p>
    );
  }
  // Keyed so the edit form resets when another topic is opened.
  return <TopicView key={topic.id} topic={topic} />;
}

function TopicView({ topic }: { topic: Topic }) {
  const { progress, updateTopic, removeTopic, updateSettings } = useProgress();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(topic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const dirty = JSON.stringify(draft) !== JSON.stringify(topic);
  const mistakes = progress.review.filter((r) => r.topicId === topic.id && r.status === "open").length;

  async function start(types: ExerciseType[], count: number) {
    setBusy(true);
    setError(undefined);
    try {
      const exercises = await generateExercises({
        language: progress.settings.language,
        topic,
        types,
        count,
      });
      updateSettings(
        { types: { ...progress.settings.types, [topic.kind]: types }, count },
        { persist: false },
      );
      saveSession({ label: topic.title, exercises, dueRules: [], answers: [], position: 0 });
      navigate("/practice");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <Link to="/" className="muted">
        ← All topics
      </Link>
      <h1>{topic.title}</h1>
      <p className="muted">
        {topic.subject}
        {topic.targetLanguage ? ` · ${topic.targetLanguage}` : ""}
        {mistakes ? ` · ${mistakes} to review` : ""}
      </p>

      <SessionOptions kind={topic.kind} busy={busy} onStart={(types, count) => void start(types, count)} />
      {error && <p className="error">{error}</p>}

      <section className="card stack">
        <h2>Rules</h2>
        <ol>
          {topic.rules.map((r) => (
            <li key={r.id}>{r.text}</li>
          ))}
        </ol>
      </section>

      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          updateTopic(draft);
        }}
      >
        <h2>Topic settings</h2>
        <label>
          Title
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label>
          Subject
          <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
        </label>
        <label>
          Kind
          <select
            value={draft.kind}
            onChange={(e) =>
              setDraft({ ...draft, kind: e.target.value === "language" ? "language" : "general" })
            }
          >
            <option value="language">Language</option>
            <option value="general">General</option>
          </select>
        </label>
        {draft.kind === "language" && (
          <label>
            Language being learned
            <input
              value={draft.targetLanguage ?? ""}
              onChange={(e) => setDraft({ ...draft, targetLanguage: e.target.value || undefined })}
            />
          </label>
        )}
        <label>
          Instructions for the AI
          <textarea
            rows={4}
            value={draft.instructions}
            onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
          />
        </label>
        <div className="row">
          <button type="submit" className="primary" disabled={!dirty}>
            Save
          </button>
          <button
            type="button"
            className="link error"
            onClick={() => {
              if (confirm(`Delete "${topic.title}" and its review items?`)) {
                removeTopic(topic.id);
                navigate("/");
              }
            }}
          >
            Delete topic
          </button>
        </div>
      </form>
    </div>
  );
}
