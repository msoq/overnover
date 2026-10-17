"use client";

import { EXERCISE_TYPES, EXERCISE_TYPE_LABELS, type ExerciseType } from "@/lib/types";

interface Props {
  types: ExerciseType[];
  count: number;
  onChange: (next: { types: ExerciseType[]; count: number }) => void;
}

/** Exercise type checkboxes and batch size. */
export function SessionOptions({ types, count, onChange }: Props) {
  const toggle = (t: ExerciseType) => {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    // Keep the canonical order so the saved selection is stable.
    onChange({ types: EXERCISE_TYPES.filter((x) => next.includes(x)), count });
  };

  return (
    <fieldset className="options">
      <legend>Exercises</legend>
      <div className="checks">
        {EXERCISE_TYPES.map((t) => (
          <label key={t} className="check">
            <input type="checkbox" checked={types.includes(t)} onChange={() => toggle(t)} />
            {EXERCISE_TYPE_LABELS[t]}
          </label>
        ))}
      </div>
      <label className="count">
        How many
        <input
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => onChange({ types, count: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
        />
      </label>
      {types.length === 0 && <p className="hint error">Pick at least one type.</p>}
    </fieldset>
  );
}
