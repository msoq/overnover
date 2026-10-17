import { randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}
