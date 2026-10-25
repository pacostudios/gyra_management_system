import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";
import type { Redis } from "../redis/redis";

/** Applied to every job unless a queue overrides it. Jobs must be idempotent: they can run more than once. */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

/** Producer side, used by the API to enqueue work. Payloads carry IDs, not full records. */
export function createQueue<Data>(name: string, connection: Redis): Queue<Data> {
  return new Queue<Data>(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
}

/** A queue the worker process consumes. Modules export these; worker.ts registers them. */
export interface QueueProcessor<Data = unknown> {
  name: string;
  process: Processor<Data>;
  concurrency?: number;
}

export function createWorker<Data>(
  processor: QueueProcessor<Data>,
  connection: Redis,
): Worker<Data> {
  return new Worker<Data>(processor.name, processor.process, {
    connection,
    concurrency: processor.concurrency ?? 5,
  });
}
