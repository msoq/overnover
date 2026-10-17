import type { Attempt, Exercise, ReviewItem, Topic } from "../types";
import { FileStore } from "./file";
import { SheetsStore } from "./sheets";

/** Everything the app persists. Swap the implementation to move off Google Sheets. */
export interface Store {
  listTopics(): Promise<Topic[]>;
  getTopic(id: string): Promise<Topic | undefined>;
  addTopic(topic: Topic): Promise<void>;

  addExercises(exercises: Exercise[]): Promise<void>;
  getExercise(id: string): Promise<Exercise | undefined>;
  updateExercise(exercise: Exercise): Promise<void>;

  addAttempt(attempt: Attempt): Promise<void>;

  listReviewItems(): Promise<ReviewItem[]>;
  saveReviewItem(item: ReviewItem): Promise<void>;
}

let store: Store | undefined;

export function getStore(): Store {
  if (!store) {
    const kind = process.env.STORAGE ?? "file";
    store = kind === "sheets" ? new SheetsStore() : new FileStore();
  }
  return store;
}
