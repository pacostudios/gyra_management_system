import { promisify } from "node:util";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createPrisma } from "./core/db/prisma";
import { createLogger } from "./core/logger/logger";
import { createRedis } from "./core/redis/redis";
import { onShutdown } from "./core/shutdown";

const env = parseEnv(process.env);
const logger = createLogger(env);
const prisma = createPrisma(env.DATABASE_URL);
const redis = createRedis(env.REDIS_URL, "api");

redis.on("error", (err) => logger.warn({ err }, "redis connection error"));

const app = createApp({
  logger,
  apiDocs: env.API_DOCS_ENABLED,
  readinessChecks: {
    database: () => prisma.$queryRaw`SELECT 1`,
    redis: () => redis.ping(),
  },
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "api listening");
});

onShutdown(logger, async () => {
  // Stop accepting connections and let in-flight requests finish, then close pools.
  server.closeIdleConnections();
  await promisify(server.close.bind(server))();
  await Promise.all([prisma.$disconnect(), redis.quit()]);
});
