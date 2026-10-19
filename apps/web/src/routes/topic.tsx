import type { ExerciseType, Topic } from "@overnover/core";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Menu } from "../components/Menu";
import { StartCard } from "../components/StartCard";
import { useProgress } from "../lib/progress";
import { useStartSession } from "../lib/start";

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
  // Keyed so the edit forms reset when another topic is opened.
  return <TopicView key={topic.id} topic={topic} />;
}

type Editing = "title" | "preferences" | undefined;

function TopicView({ topic }: { topic: Topic }) {
  const { updateTopic, removeTopic } = useProgress();
  const startSession = useStartSession();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Editing>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function start(types: ExerciseType[], count: number) {
    setBusy(true);
    setError(undefined);
    try {
      await startSession(topic, types, count);
      navigate("/practice");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <Link to="/" className="muted">
        ← Topics
      </Link>
      <div className="row spread">
        <h1>{topic.title}</h1>
        <Menu label="Topic options" trigger="⋯">
          {(close) => (
            <>
              <button
                type="button"
                className="link"
                onClick={() => {
                  setEditing("title");
                  close();
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="link"
                onClick={() => {
                  setEditing("preferences");
                  close();
                }}
              >
                Exercise preferences
              </button>
              <button
                type="button"
                className="link error"
                onClick={() => {
                  if (confirm(`Delete "${topic.title}"?`)) {
                    removeTopic(topic.id);
                    navigate("/");
                  }
                }}
              >
                Delete
              </button>
            </>
          )}
        </Menu>
      </div>

      {editing && (
        <EditField
          topic={topic}
          field={editing}
          onDone={(next) => {
            if (next) updateTopic(next);
            setEditing(undefined);
          }}
        />
      )}

      <StartCard topic={topic} busy={busy} error={error} onStart={(t, c) => void start(t, c)} />
    </div>
  );
}

function EditField({
  topic,
  field,
  onDone,
}: {
  topic: Topic;
  field: "title" | "preferences";
  onDone(next?: Topic): void;
}) {
  const [value, setValue] = useState(field === "title" ? topic.title : topic.instructions);
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (field === "title") onDone(trimmed ? { ...topic, title: trimmed } : undefined);
        else onDone({ ...topic, instructions: trimmed });
      }}
    >
      {field === "title" ? (
        <label>
          Title
          <input value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
      ) : (
        <label>
          Exercise preferences
          <textarea
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="For example: B1 level, more translations from Russian"
          />
          <span className="muted small">Used for the next exercises on this topic.</span>
        </label>
      )}
      <div className="row">
        <button type="submit" className="primary">
          Save
        </button>
        <button type="button" className="link" onClick={() => onDone()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
