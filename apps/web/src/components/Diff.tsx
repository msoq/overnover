import { diffChars } from "@overnover/core";

/** The correct version, with what the learner missed or got wrong highlighted. */
export function Diff({ answer, correct }: { answer: string; correct: string }) {
  return (
    <span className="diff">
      {diffChars(answer, correct).map((part, i) =>
        part.kind === "same" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: parts have no identity beyond position
          <span key={i}>{part.text}</span>
        ) : part.kind === "added" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: as above
          <ins key={i}>{part.text}</ins>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: as above
          <del key={i}>{part.text}</del>
        ),
      )}
    </span>
  );
}
