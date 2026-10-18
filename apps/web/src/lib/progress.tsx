// Holds the user's progress in memory: one read when the app opens, one write when
// something worth keeping changes (a new topic, a finished session). Until a write
// succeeds, the latest snapshot also sits in localStorage so nothing is lost.
import { applyOutcomes, type Progress, type Settings, type Topic } from "@overnover/core";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { STORAGE } from "./config";
import { currentEmail, getAccessToken, signOut as googleSignOut, hasSignedInBefore } from "./google";
import { createStore } from "./storage";

type Status = "starting" | "signed-out" | "loading" | "ready" | "error";

export interface Outcome {
  topicId: string;
  ruleId: string;
  correct: boolean;
  isReview: boolean;
}

interface ProgressContext {
  status: Status;
  error?: string;
  progress: Progress;
  saving: boolean;
  saveError?: string;
  signIn(): Promise<void>;
  signOut(): void;
  retrySave(): Promise<void>;
  addTopic(topic: Topic): void;
  updateTopic(topic: Topic): void;
  removeTopic(id: string): void;
  /** `persist: false` keeps the change in this browser until the next write. */
  updateSettings(patch: Partial<Settings>, options?: { persist?: boolean }): void;
  finishSession(outcomes: Outcome[]): void;
}

const EMPTY: Progress = { topics: [], review: [], settings: { language: "", types: {}, count: 10 } };
const Ctx = createContext<ProgressContext | undefined>(undefined);

const pendingKey = () => `overnover.pending.${currentEmail() ?? "local"}`;

function readPending(): Progress | undefined {
  try {
    const raw = localStorage.getItem(pendingKey());
    return raw ? (JSON.parse(raw) as Progress) : undefined;
  } catch {
    return undefined;
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createStore(), []);
  const [status, setStatus] = useState<Status>("starting");
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const latest = useRef(progress);

  const write = useCallback(
    async (next: Progress) => {
      setSaving(true);
      setSaveError(undefined);
      try {
        await store.save(next);
        // Only clear the snapshot if nothing newer replaced it meanwhile.
        if (latest.current === next) localStorage.removeItem(pendingKey());
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [store],
  );

  const load = useCallback(async () => {
    setStatus("loading");
    setError(undefined);
    try {
      const loaded = await store.load();
      const pending = readPending();
      const next = pending ?? loaded;
      latest.current = next;
      setProgress(next);
      setStatus("ready");
      if (pending) void write(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [store, write]);

  useEffect(() => {
    if (STORAGE === "local") {
      void load();
    } else if (hasSignedInBefore()) {
      getAccessToken(false).then(load, () => setStatus("signed-out"));
    } else {
      setStatus("signed-out");
    }
  }, [load]);

  const commit = useCallback(
    (change: (p: Progress) => Progress, persist = true) => {
      const next = change(latest.current);
      latest.current = next;
      setProgress(next);
      try {
        localStorage.setItem(pendingKey(), JSON.stringify(next));
      } catch {
        // Quota or privacy mode: the write below is still attempted.
      }
      if (persist) void write(next);
    },
    [write],
  );

  const value: ProgressContext = {
    status,
    error,
    progress,
    saving,
    saveError,
    async signIn() {
      try {
        await getAccessToken(true);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("signed-out");
      }
    },
    signOut() {
      googleSignOut();
      latest.current = EMPTY;
      setProgress(EMPTY);
      setStatus("signed-out");
    },
    async retrySave() {
      if (STORAGE === "sheets") await getAccessToken(true);
      await write(latest.current);
    },
    addTopic: (topic) => commit((p) => ({ ...p, topics: [topic, ...p.topics] })),
    updateTopic: (topic) =>
      commit((p) => ({ ...p, topics: p.topics.map((t) => (t.id === topic.id ? topic : t)) })),
    removeTopic: (id) =>
      commit((p) => ({
        ...p,
        topics: p.topics.filter((t) => t.id !== id),
        review: p.review.filter((r) => r.topicId !== id),
      })),
    updateSettings: (patch, options) =>
      commit((p) => ({ ...p, settings: { ...p.settings, ...patch } }), options?.persist ?? true),
    finishSession: (outcomes) => commit((p) => ({ ...p, review: applyOutcomes(p.review, outcomes) })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
