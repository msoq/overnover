"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { EXERCISE_TYPE_LABELS, type AttemptResult, type PublicExercise } from "@/lib/types";

interface Outcome {
  result: AttemptResult;
  feedback: string;
  correctAnswer?: string;
  answer: string;
}

interface Props {
  exercises: PublicExercise[];
  onAgain?: () => void;
  againLabel?: string;
}

/** Shows exercises one at a time, checks each answer as it's submitted, then a summary. */
export function Runner({ exercises, onAgain, againLabel = "New batch" }: Props) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showRule, setShowRule] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const exercise = exercises[index];
  const outcome = outcomes[index];
  const finished = index >= exercises.length;

  useEffect(() => {
    if (outcome) nextRef.current?.focus();
    else inputRef.current?.focus();
  }, [outcome, index]);

  async function send(path: "/api/answer" | "/api/reveal") {
    setBusy(true);
    setError("");
    try {
      const res = await api<Omit<Outcome, "answer">>(path, { body: { exerciseId: exercise.id, answer } });
      setOutcomes((o) => [...o, { ...res, answer }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setIndex((i) => i + 1);
    setAnswer("");
    setShowRule(false);
  }

  if (exercises.length === 0) {
    return <p className="card">Nothing to practise right now.</p>;
  }

  if (finished) {
    const correct = outcomes.filter((o) => o.result === "correct").length;
    const missed = exercises.map((e, i) => ({ e, o: outcomes[i] })).filter(({ o }) => o.result !== "correct");
    return (
      <section className="card">
        <h2>
          {correct} / {exercises.length} correct
        </h2>
        {missed.length > 0 ? (
          <>
            <p className="hint">These come back for review tomorrow, then after 3, 7 and 14 days.</p>
            <ul className="missed">
              {missed.map(({ e, o }) => (
                <li key={e.id}>
                  <div className="prompt-sm">{e.prompt}</div>
                  {o.answer && <div className="wrong-text">{o.answer}</div>}
                  <div className="right-text">{o.correctAnswer}</div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>All correct.</p>
        )}
        <div className="row">
          {onAgain && (
            <button className="primary" onClick={onAgain}>
              {againLabel}
            </button>
          )}
          <Link className="button" href="/">
            Home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card exercise">
      <div className="meta">
        <span className="badge">{EXERCISE_TYPE_LABELS[exercise.type]}</span>
        <span className="hint">
          {exercise.topicTitle} · {index + 1} / {exercises.length}
        </span>
      </div>
      <progress value={index + (outcome ? 1 : 0)} max={exercises.length} />
      {exercise.instruction && <p className="instruction">{exercise.instruction}</p>}
      <p className="prompt">{exercise.prompt}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (outcome) next();
          else if (answer.trim() && !busy) send("/api/answer");
        }}
      >
        <input
          ref={inputRef}
          className="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!outcome || busy}
          placeholder="Your answer"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        {!outcome && (
          <div className="row">
            <button className="primary" type="submit" disabled={busy || !answer.trim()}>
              {busy ? "Checking…" : "Check"}
            </button>
            <button type="button" onClick={() => setShowRule(true)} disabled={showRule}>
              Show rule
            </button>
            <button type="button" onClick={() => send("/api/reveal")} disabled={busy}>
              Reveal answer
            </button>
          </div>
        )}

        {showRule && !outcome && <p className="rule">{exercise.ruleText}</p>}
        {error && <p className="error">{error}</p>}

        {outcome && (
          <div className={`result ${outcome.result === "correct" ? "ok" : "bad"}`}>
            {outcome.result === "correct" && <strong>Correct</strong>}
            {outcome.result !== "correct" && (
              <>
                <strong>{outcome.result === "revealed" ? "Answer" : "Not quite"}</strong>
                <p className="right-text">{outcome.correctAnswer}</p>
                {outcome.feedback ? <p>{outcome.feedback}</p> : <p className="hint">{exercise.ruleText}</p>}
              </>
            )}
            <button ref={nextRef} className="primary" type="submit">
              {index + 1 < exercises.length ? "Next" : "Finish"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
