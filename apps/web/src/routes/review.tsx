import { EXERCISE_TYPES, type ExerciseType, isDue } from "@overnover/core";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { generateExercises } from "../lib/api";
import { useProgress } from "../lib/progress";
import { ruleKey, saveSession } from "../lib/session";

/** Builds a review session: one fresh exercise per rule, per topic, then hands over to practice. */
export default function Review() {
  const [params] = useSearchParams();
  const mode = params.get("mode") === "all" ? "all" : "due";
  const { progress } = useProgress();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const started = useRef(false);

  const open = progress.review.filter((r) => r.status === "open");
  const items = mode === "due" ? open.filter((r) => isDue(r)) : open;

  useEffect(() => {
    if (started.current || items.length === 0) return;
    started.current = true;
    const byTopic = new Map<string, string[]>();
    for (const r of items) byTopic.set(r.topicId, [...(byTopic.get(r.topicId) ?? []), r.ruleId]);

    const { language, types } = progress.settings;
    Promise.all(
      [...byTopic].flatMap(([topicId, ruleIds]) => {
        const topic = progress.topics.find((t) => t.id === topicId);
        if (!topic) return [];
        const last = types[topic.kind];
        const chosen: ExerciseType[] = last?.length ? last : [...EXERCISE_TYPES[topic.kind]];
        return [generateExercises({ language, topic, types: chosen, count: ruleIds.length, ruleIds })];
      }),
    )
      .then((batches) => {
        saveSession({
          label: mode === "due" ? "Due today" : "Review my mistakes",
          exercises: batches.flat(),
          // Only items that are due move up the schedule when answered correctly.
          dueRules: items.filter((r) => isDue(r)).map((r) => ruleKey(r.topicId, r.ruleId)),
          answers: [],
          position: 0,
        });
        navigate("/practice", { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [items, mode, navigate, progress]);

  if (items.length === 0) {
    return (
      <p>
        {mode === "due" ? "Nothing is due today." : "No mistakes to review."} <Link to="/">Back</Link>
      </p>
    );
  }
  if (error) {
    return (
      <p className="error">
        Couldn't prepare the review: {error} <Link to="/">Back</Link>
      </p>
    );
  }
  return <p className="muted center">Writing {items.length} review exercises…</p>;
}
