import { EXERCISE_TYPE_LABELS, type Exercise, matchAnswer, normalizeAnswer } from "@overnover/core";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { Diff } from "../components/Diff";
import { checkAnswer } from "../lib/api";
import { useProgress } from "../lib/progress";
import {
  type AnswerRecord,
  clearSession,
  isCorrect,
  loadSession,
  ruleKey,
  type SavedSession,
  saveSession,
} from "../lib/session";

export default function Practice() {
  const [session, setSession] = useState(loadSession);
  if (!session || session.exercises.length === 0) return <Navigate to="/" replace />;

  const update = (next: SavedSession) => {
    saveSession(next);
    setSession(next);
  };
  if (session.position >= session.exercises.length) return <Summary session={session} />;
  return <Step key={session.position} session={session} onChange={update} />;
}

function Step({ session, onChange }: { session: SavedSession; onChange(s: SavedSession): void }) {
  const { progress } = useProgress();
  const exercise = session.exercises[session.position];
  const record = session.answers[session.position] as AnswerRecord | undefined;
  const topic = progress.topics.find((t) => t.id === exercise.topicId);
  const rule = topic?.rules.find((r) => r.id === exercise.ruleId);
  const [answer, setAnswer] = useState("");
  const [showRule, setShowRule] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const next = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Keyboard flow: type, Enter to check, Enter again for the next exercise.
  useEffect(() => {
    if (record) next.current?.focus();
    else input.current?.focus();
  }, [record]);

  const record_ = (r: AnswerRecord) => {
    const answers = [...session.answers];
    answers[session.position] = r;
    onChange({ ...session, answers });
  };

  async function submit() {
    const match = matchAnswer(answer, exercise.acceptedAnswers);
    if (match.kind === "exact") return record_({ answer, outcome: "exact" });
    if (match.kind === "slip") return record_({ answer, outcome: "slip", correct: match.correct });
    if (!topic) return record_({ answer, outcome: "wrong", correct: exercise.acceptedAnswers[0] });

    setChecking(true);
    setError(undefined);
    try {
      const res = await checkAnswer({ language: progress.settings.language, topic, exercise, answer });
      if (res.correct) {
        const slipped = res.corrected && normalizeAnswer(res.corrected) !== normalizeAnswer(answer);
        record_(slipped ? { answer, outcome: "slip", correct: res.corrected } : { answer, outcome: "exact" });
      } else {
        record_({
          answer,
          outcome: "wrong",
          correct: exercise.acceptedAnswers[0],
          explanation: res.explanation,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="stack">
      <div className="row spread muted">
        <span>
          {session.label} · {EXERCISE_TYPE_LABELS[exercise.type]}
        </span>
        <span>
          {session.position + 1} / {session.exercises.length}
        </span>
      </div>
      <progress value={session.position} max={session.exercises.length} />

      <section className="card stack">
        <p className="muted">{exercise.instruction}</p>
        <p className="prompt">{exercise.prompt}</p>

        {record ? (
          <Feedback record={record} />
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (answer.trim()) void submit();
            }}
          >
            <input
              ref={input}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              aria-label="Your answer"
            />
            <div className="row">
              <button type="submit" className="primary" disabled={checking || !answer.trim()}>
                {checking ? "Checking…" : "Check"}
              </button>
              {rule && (
                <button type="button" className="link" onClick={() => setShowRule((v) => !v)}>
                  {showRule ? "Hide rule" : "Show rule"}
                </button>
              )}
              <button
                type="button"
                className="link"
                onClick={() => record_({ answer, outcome: "revealed", correct: exercise.acceptedAnswers[0] })}
              >
                Reveal answer
              </button>
            </div>
            {showRule && rule && <p className="hint">{rule.text}</p>}
            {error && <p className="error">{error}</p>}
          </form>
        )}
      </section>

      {record && (
        <button
          ref={next}
          type="button"
          className="primary"
          onClick={() => onChange({ ...session, position: session.position + 1 })}
        >
          {session.position + 1 < session.exercises.length ? "Next" : "Finish"}
        </button>
      )}
    </div>
  );
}

function Feedback({ record }: { record: AnswerRecord }) {
  if (record.outcome === "exact") return <p className="ok">Correct</p>;
  if (record.outcome === "slip" && record.correct) {
    return (
      <div className="ok stack">
        <p>Correct, with a small slip:</p>
        <p className="answer">
          <Diff answer={record.answer} correct={record.correct} />
        </p>
      </div>
    );
  }
  return (
    <div className="bad stack">
      <p>{record.outcome === "revealed" ? "The answer is:" : "Not quite. The answer is:"}</p>
      <p className="answer">{record.correct}</p>
      {record.explanation && <p>{record.explanation}</p>}
    </div>
  );
}

function Summary({ session }: { session: SavedSession }) {
  const { finishSession, saving, saveError } = useProgress();
  const saved = useRef(false);
  const results = session.exercises.map((e, i) => ({ exercise: e, record: session.answers[i] }));
  const right = results.filter((r) => r.record && isCorrect(r.record.outcome)).length;

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    finishSession(
      results
        .filter((r) => r.record)
        .map(({ exercise, record }) => ({
          topicId: exercise.topicId,
          ruleId: exercise.ruleId,
          correct: isCorrect(record.outcome),
          isReview: session.dueRules.includes(ruleKey(exercise.topicId, exercise.ruleId)),
        })),
    );
    clearSession();
  });

  const missed = results.filter((r) => r.record && !isCorrect(r.record.outcome));
  return (
    <div className="stack">
      <h1>
        {right} of {session.exercises.length} correct
      </h1>
      <p className="muted">{saving ? "Saving…" : saveError ? "Not saved yet." : "Progress saved."}</p>
      {missed.length > 0 && (
        <section className="card stack">
          <h2>To review</h2>
          <ul className="list">
            {missed.map(({ exercise, record }) => (
              <MissedItem key={exercise.id} exercise={exercise} correct={record.correct ?? ""} />
            ))}
          </ul>
          <p className="muted">These come back for review tomorrow.</p>
        </section>
      )}
      <Link to="/" className="button primary">
        Done
      </Link>
    </div>
  );
}

function MissedItem({ exercise, correct }: { exercise: Exercise; correct: string }) {
  return (
    <li>
      {exercise.prompt}
      <br />
      <strong>{correct}</strong>
    </li>
  );
}
