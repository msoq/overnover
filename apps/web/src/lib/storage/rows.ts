// Converts progress to and from spreadsheet rows. Kept separate so it can be tested without Google.
import { DEFAULT_SETTINGS, type Progress, type ReviewItem, type Settings, type Topic } from "@overnover/core";

export const TOPIC_COLUMNS = [
  "id",
  "title",
  "subject",
  "kind",
  "targetLanguage",
  "instructions",
  "rules",
  "sourceText",
  "createdAt",
] as const;
export const REVIEW_COLUMNS = ["topicId", "ruleId", "step", "dueAt", "status"] as const;
export const SETTINGS_COLUMNS = ["key", "value"] as const;

type Row = (string | number)[];

export function topicToRow(t: Topic): Row {
  return [
    t.id,
    t.title,
    t.subject,
    t.kind,
    t.targetLanguage ?? "",
    t.instructions,
    JSON.stringify(t.rules),
    t.sourceText,
    t.createdAt,
  ];
}

export function rowToTopic(r: Row): Topic | undefined {
  const [id, title, subject, kind, targetLanguage, instructions, rules, sourceText, createdAt] = r.map((v) =>
    String(v ?? ""),
  );
  if (!id) return undefined;
  let parsedRules: Topic["rules"] = [];
  try {
    parsedRules = JSON.parse(rules);
  } catch {
    // A hand-edited cell; keep the topic without rules rather than failing the whole load.
  }
  return {
    id,
    title,
    subject,
    kind: kind === "language" ? "language" : "general",
    targetLanguage: targetLanguage || undefined,
    instructions,
    rules: parsedRules,
    sourceText,
    createdAt,
  };
}

export function reviewToRow(r: ReviewItem): Row {
  return [r.topicId, r.ruleId, r.step, r.dueAt, r.status];
}

export function rowToReview(r: Row): ReviewItem | undefined {
  const [topicId, ruleId, step, dueAt, status] = r.map((v) => String(v ?? ""));
  if (!topicId || !ruleId) return undefined;
  return { topicId, ruleId, step: Number(step) || 0, dueAt, status: status === "done" ? "done" : "open" };
}

export function settingsToRows(s: Settings): Row[] {
  return [
    ["language", s.language],
    ["types", JSON.stringify(s.types)],
    ["count", s.count],
  ];
}

export function rowsToSettings(rows: Row[]): Settings {
  const map = new Map(rows.map((r) => [String(r[0]), String(r[1] ?? "")]));
  let types: Settings["types"] = {};
  try {
    types = JSON.parse(map.get("types") || "{}");
  } catch {
    // Fall back to defaults.
  }
  return {
    language: map.get("language") || DEFAULT_SETTINGS.language,
    types,
    count: Number(map.get("count")) || DEFAULT_SETTINGS.count,
  };
}

export function rowsToProgress(topics: Row[], review: Row[], settings: Row[]): Progress {
  return {
    topics: topics.map(rowToTopic).filter((t): t is Topic => t !== undefined),
    review: review.map(rowToReview).filter((r): r is ReviewItem => r !== undefined),
    settings: rowsToSettings(settings),
  };
}
