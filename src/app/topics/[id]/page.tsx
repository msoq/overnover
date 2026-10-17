"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Runner } from "@/components/Runner";
import { SessionOptions } from "@/components/SessionOptions";
import { api } from "@/lib/api";
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from "@/lib/prefs";
import type { PublicExercise, Topic } from "@/lib/types";

export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [exercises, setExercises] = useState<PublicExercise[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const autoStarted = useRef(false);

  const start = useCallback(
    async (p: Prefs) => {
      setBusy(true);
      setError("");
      setExercises(null);
      try {
        setExercises(await api<PublicExercise[]>("/api/sessions", { body: { topicId: id, types: p.types, count: p.count } }));
        setRound((r) => r + 1);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [id],
  );

  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    api<Topic>(`/api/topics/${id}`).then(setTopic).catch((e) => setError(e.message));
    // Coming straight from "Create and start": generate right away with the saved options.
    if (!autoStarted.current && new URLSearchParams(window.location.search).get("start") === "1") {
      autoStarted.current = true;
      window.history.replaceState(null, "", `/topics/${id}`);
      start(p);
    }
  }, [id, start]);

  function update(next: Partial<Prefs>) {
    setPrefs((p) => ({ ...p, ...next }));
    savePrefs(next);
  }

  return (
    <>
      {topic && (
        <section className="topic-head">
          <h1>{topic.title}</h1>
          <p className="hint">
            {topic.fromLang} → {topic.toLang}
          </p>
          <details>
            <summary>Rules in this topic ({topic.rules.length})</summary>
            <ol>
              {topic.rules.map((r) => (
                <li key={r.id}>{r.text}</li>
              ))}
            </ol>
          </details>
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {busy && <p className="card hint">Generating exercises…</p>}

      {exercises && !busy && <Runner key={round} exercises={exercises} onAgain={() => setExercises(null)} />}

      {!exercises && !busy && (
        <section className="card">
          <SessionOptions types={prefs.types} count={prefs.count} onChange={update} />
          <button className="primary" disabled={prefs.types.length === 0} onClick={() => start(prefs)}>
            Start
          </button>
        </section>
      )}
    </>
  );
}
