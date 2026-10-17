"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SessionOptions } from "@/components/SessionOptions";
import { api } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from "@/lib/prefs";
import type { Topic } from "@/lib/types";

type TopicSummary = Topic & { openMistakes: number; dueMistakes: number };

export default function Home() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [topics, setTopics] = useState<TopicSummary[] | null>(null);
  const [counts, setCounts] = useState({ due: 0, open: 0 });
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPrefs(loadPrefs());
    api<TopicSummary[]>("/api/topics").then(setTopics).catch((e) => setError(e.message));
    api<{ due: number; open: number }>("/api/review").then(setCounts).catch(() => {});
  }, []);

  function update(next: Partial<Prefs>) {
    setPrefs((p) => ({ ...p, ...next }));
    savePrefs(next);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() && files.length === 0) {
      setError("Add a file, a screenshot or a text prompt.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("prompt", prompt);
    form.set("fromLang", prefs.fromLang);
    form.set("toLang", prefs.toLang);
    files.forEach((f) => form.append("files", f));
    try {
      const topic = await api<Topic>("/api/topics", { form });
      router.push(`/topics/${topic.id}?start=1`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      {counts.open > 0 && (
        <section className="card review-bar">
          <div>
            <strong>{counts.due}</strong> due today · {counts.open} open mistakes
          </div>
          <div className="row">
            <Link className={`button ${counts.due ? "primary" : "disabled"}`} href="/review?mode=due">
              Review due
            </Link>
            <Link className="button" href="/review?mode=all">
              Review my mistakes
            </Link>
          </div>
        </section>
      )}

      <form className="card" onSubmit={create}>
        <h2>New topic</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste notes, or describe a topic, e.g. “presente de subjuntivo after quizá / tal vez”"
          rows={4}
        />
        <label className="file">
          <span>Document or screenshot</span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.docx,.txt,.md"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <div className="langs">
          <label>
            From
            <select value={prefs.fromLang} onChange={(e) => update({ fromLang: e.target.value })}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            To
            <select value={prefs.toLang} onChange={(e) => update({ toLang: e.target.value })}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <SessionOptions types={prefs.types} count={prefs.count} onChange={update} />
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy || prefs.types.length === 0}>
          {busy ? "Reading the material…" : "Create and start"}
        </button>
      </form>

      <section>
        <h2>Topics</h2>
        {topics === null && !error && <p className="hint">Loading…</p>}
        {topics?.length === 0 && <p className="hint">No topics yet.</p>}
        <ul className="topics">
          {topics?.map((t) => (
            <li key={t.id}>
              <Link href={`/topics/${t.id}`} className="card topic">
                <span className="title">{t.title}</span>
                <span className="hint">
                  {t.fromLang} → {t.toLang} · {new Date(t.createdAt).toLocaleDateString()}
                  {t.openMistakes > 0 && ` · ${t.openMistakes} to review`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
