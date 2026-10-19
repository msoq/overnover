import { useState } from "react";
import { Link } from "react-router";
import { useProgress } from "../lib/progress";
import { loadSession } from "../lib/session";
import { dueCount } from "../lib/start";

export default function Home() {
  const { progress } = useProgress();
  const [session] = useState(loadSession);
  const unfinished = session && session.position < session.exercises.length ? session : undefined;

  if (progress.topics.length === 0) {
    return (
      <section className="card stack center empty">
        <h1>No topics yet</h1>
        <p className="muted">Describe what you're learning or upload your notes, and get exercises on it.</p>
        <Link to="/new" className="button primary">
          + New topic
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
      {unfinished && (
        <section className="card row spread">
          <span>
            {unfinished.label} · {unfinished.position} of {unfinished.exercises.length} done
          </span>
          <Link to="/practice" className="button primary">
            Continue
          </Link>
        </section>
      )}

      <ul className="topics">
        {progress.topics.map((t) => {
          const due = dueCount(progress.review, t.id);
          return (
            <li key={t.id}>
              <Link to={`/topics/${t.id}`} className="card topic">
                <span>{t.title}</span>
                {due > 0 && <span className="muted">{due} to review</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
