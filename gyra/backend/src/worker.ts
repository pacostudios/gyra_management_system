import { parseEnv } from "./config/env";
import { createLogger } from "./core/logger/logger";
import { createWorker, type QueueProcessor } from "./core/queue/queue";
import { createRedis } from "./core/redis/redis";
import { onShutdown } from "./core/shutdown";

/** Every queue the worker consumes. Modules add their processors here (email, notifications, exports…). */
const processors: QueueProcessor[] = [];

const env = parseEnv(process.env);
const logger = createLogger(env);
const redis = createRedis(env.REDIS_URL, "worker");

redis.on("error", (err) => logger.warn({ err }, "redis connection error"));

const workers = processors.map((processor) => {
  const worker = createWorker(processor, redis);
  worker.on("failed", (job, err) =>
    logger.error(
      { err, queue: processor.name, jobId: job?.id, attempt: job?.attemptsMade },
      "job failed",
    ),
  );
  return worker;
});

await redis.ping();
logger.info({ queues: processors.map((p) => p.name) }, "worker ready");

onShutdown(logger, async () => {
  // Finish the jobs in progress; unfinished ones are retried by another worker.
  await Promise.all(workers.map((w) => w.close()));
  await redis.quit();
});
