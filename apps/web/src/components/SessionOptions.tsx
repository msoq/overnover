import { EXERCISE_TYPE_LABELS, EXERCISE_TYPES, type ExerciseType, type TopicKind } from "@overnover/core";
import { useState } from "react";
import { useProgress } from "../lib/progress";

interface Props {
  kind: TopicKind;
  busy: boolean;
  onStart(types: ExerciseType[], count: number): void;
}

/** Exercise types as checkboxes, preselected with the last choice for this kind of topic. */
export function SessionOptions({ kind, busy, onStart }: Props) {
  const { progress } = useProgress();
  const available = EXERCISE_TYPES[kind] as readonly ExerciseType[];
  const last = progress.settings.types[kind]?.filter((t) => available.includes(t));
  const [types, setTypes] = useState<ExerciseType[]>(last?.length ? last : [...available]);
  const [count, setCount] = useState(progress.settings.count);

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
      <button type="submit" className="primary" disabled={busy || types.length === 0}>
        {busy ? "Writing exercises…" : "Start"}
      </button>
    </form>
  );
}
