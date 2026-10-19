import { EXERCISE_TYPE_LABELS, EXERCISE_TYPES, type ExerciseType, type Topic } from "@overnover/core";
import { type ReactNode, useState } from "react";
import { useProgress } from "../lib/progress";
import { dueCount } from "../lib/start";

interface Props {
  topic: Topic;
  busy: boolean;
  error?: string;
  onStart(types: ExerciseType[], count: number): void;
  /** Extra links under the Start button, e.g. "Not right? Refine". */
  children?: ReactNode;
}

/**
 * What the topic practises and one Start button. Exercise types and count default
 * to the last choice (all types and 10 at first) and hide under "Customize".
 */
export function StartCard({ topic, busy, error, onStart, children }: Props) {
  const { progress } = useProgress();
  const available = EXERCISE_TYPES[topic.kind] as readonly ExerciseType[];
  const last = progress.settings.types[topic.kind]?.filter((t) => available.includes(t));
  const [types, setTypes] = useState<ExerciseType[]>(last?.length ? last : [...available]);
  const [count, setCount] = useState(progress.settings.count);
  const due = dueCount(progress.review, topic.id);

  const toggle = (t: ExerciseType) =>
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : available.filter((x) => x === t || prev.includes(x)),
    );

  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(types, count);
      }}
    >
      <p className="muted">You'll practise:</p>
      <ul className="list">
        {topic.rules.map((r) => (
          <li key={r.id}>{r.text}</li>
        ))}
      </ul>
      {due > 0 && (
        <p className="muted">
          Includes {due} {due === 1 ? "mistake" : "mistakes"} from earlier sessions.
        </p>
      )}
      <button type="submit" className="primary" disabled={busy || types.length === 0}>
        {busy ? "Writing exercises…" : `Start · ${count} exercises`}
      </button>
      {error && <p className="error">{error}</p>}
      <details>
        <summary>Customize</summary>
        <div className="stack">
          <fieldset className="checks">
            <legend>Exercise types</legend>
            {available.map((t) => (
              <label key={t}>
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggle(t)} />
                {EXERCISE_TYPE_LABELS[t]}
              </label>
            ))}
          </fieldset>
          <label className="inline">
            How many
            <input
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            />
          </label>
        </div>
      </details>
      {children}
    </form>
  );
}
