import { once } from "node:events";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseEnv } from "../../src/config/env";
import { createPrisma } from "../../src/core/db/prisma";
import { createRedis } from "../../src/core/redis/redis";
import { createTestApp } from "../helpers/test-app";

// Runs against the real Postgres and Redis from `docker compose up`.
const env = parseEnv(process.env);
const prisma = createPrisma(env.DATABASE_URL);
const redis = createRedis(env.REDIS_URL, "api");

const app = createTestApp({
  readinessChecks: {
    database: () => prisma.$queryRaw`SELECT 1`,
    redis: () => redis.ping(),
  },
});

// The API client fails fast instead of queueing, so wait for the connection before probing.
beforeAll(async () => {
  if (redis.status !== "ready") await once(redis, "ready");
});

afterAll(async () => {
  await Promise.all([prisma.$disconnect(), redis.quit()]);
});

describe("health endpoints", () => {
  it("GET /healthz is 200", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /readyz is 200 when Postgres and Redis are reachable", async () => {
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", checks: { database: "ok", redis: "ok" } });
  });

  it("GET /readyz is 503 when Redis is unreachable", async () => {
    const downRedis = createRedis("redis://localhost:1", "api");
    downRedis.on("error", () => {});
    const appWithDownRedis = createTestApp({
      readinessChecks: {
        database: () => prisma.$queryRaw`SELECT 1`,
        redis: () => downRedis.ping(),
      },
    });

    const res = await request(appWithDownRedis).get("/readyz");
    expect(res.status).toBe(503);
    expect(res.body.checks).toEqual({ database: "ok", redis: "error" });
    downRedis.disconnect();
  });
});
