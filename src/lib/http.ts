import { NextResponse } from "next/server";
import { NotFoundError } from "./service";
import { EXERCISE_TYPES, type ExerciseType } from "./types";

/** Runs a route handler, turning thrown errors into JSON error responses. */
export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch (err) {
    if (err instanceof BadRequestError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 500 });
  }
}

export class BadRequestError extends Error {}

export function parseTypes(value: unknown): ExerciseType[] {
  const types = Array.isArray(value) ? value.filter((t): t is ExerciseType => EXERCISE_TYPES.includes(t)) : [];
  if (types.length === 0) throw new BadRequestError("Pick at least one exercise type");
  return types;
}
