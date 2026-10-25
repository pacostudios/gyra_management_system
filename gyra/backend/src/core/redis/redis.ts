import { Redis } from "ioredis";

/**
 * - `api`: fails fast while Redis is down, so requests and /readyz don't hang.
 * - `worker`: retries forever, as BullMQ workers require (maxRetriesPerRequest: null).
 */
export function createRedis(url: string, role: "api" | "worker"): Redis {
  return role === "api"
    ? new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
    : new Redis(url, { maxRetriesPerRequest: null });
}

export type { Redis };
