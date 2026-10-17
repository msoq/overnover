import { promises as fs } from "node:fs";
import path from "node:path";
import type { Attempt, Exercise, ReviewItem, Topic } from "../types";
import type { Store } from "./index";

interface Data {
  topics: Topic[];
  exercises: Exercise[];
  attempts: Attempt[];
  review: ReviewItem[];
}

/** Keeps everything in one JSON file. Useful for trying the app without Google setup. */
export class FileStore implements Store {
  private file: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(file = process.env.STORE_FILE ?? path.join(process.cwd(), "data", "store.json")) {
    this.file = file;
  }

  private async read(): Promise<Data> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as Data;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return { topics: [], exercises: [], attempts: [], review: [] };
      }
      throw err;
    }
  }

  /** Serializes read-modify-write cycles so concurrent requests don't drop writes. */
  private update(fn: (data: Data) => void): Promise<void> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      fn(data);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(data, null, 2));
    });
    this.queue = run.catch(() => {});
    return run;
  }

  async listTopics() {
    return (await this.read()).topics;
  }
  async getTopic(id: string) {
    return (await this.read()).topics.find((t) => t.id === id);
  }
  addTopic(topic: Topic) {
    return this.update((d) => void d.topics.push(topic));
  }

  addExercises(exercises: Exercise[]) {
    return this.update((d) => void d.exercises.push(...exercises));
  }
  async getExercise(id: string) {
    return (await this.read()).exercises.find((e) => e.id === id);
  }
  updateExercise(exercise: Exercise) {
    return this.update((d) => {
      d.exercises = d.exercises.map((e) => (e.id === exercise.id ? exercise : e));
    });
  }

  addAttempt(attempt: Attempt) {
    return this.update((d) => void d.attempts.push(attempt));
  }

  async listReviewItems() {
    return (await this.read()).review;
  }
  saveReviewItem(item: ReviewItem) {
    return this.update((d) => {
      const i = d.review.findIndex((r) => r.id === item.id);
      if (i >= 0) d.review[i] = item;
      else d.review.push(item);
    });
  }
}
