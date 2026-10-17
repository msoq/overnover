"use client";

import { useEffect, useRef, useState } from "react";
import { Runner } from "@/components/Runner";
import { api } from "@/lib/api";
import { loadPrefs } from "@/lib/prefs";
import type { PublicExercise } from "@/lib/types";

export default function ReviewPage() {
  const [mode, setMode] = useState<"due" | "all">("due");
  const [exercises, setExercises] = useState<PublicExercise[] | null>(null);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    // Generating costs an AI call, so don't repeat it when React re-runs effects in dev.
    if (started.current) return;
    started.current = true;
    const m = new URLSearchParams(window.location.search).get("mode") === "all" ? "all" : "due";
    setMode(m);
    api<PublicExercise[]>("/api/review", { body: { mode: m, types: loadPrefs().types } })
      .then(setExercises)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <h1>{mode === "due" ? "Due for review" : "Review my mistakes"}</h1>
      {error && <p className="error">{error}</p>}
      {!exercises && !error && <p className="card hint">Generating fresh exercises on your mistakes…</p>}
      {exercises && <Runner exercises={exercises} />}
    </>
  );
}
