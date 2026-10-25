import type { Liveness, Readiness } from "@gyra/shared";
import { Router } from "express";

/** A dependency /readyz checks. Resolves when healthy, rejects otherwise. */
export type ReadinessCheck = () => Promise<unknown>;

const CHECK_TIMEOUT_MS = 2_000;

function withTimeout(check: ReadinessCheck): Promise<unknown> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timed out")), CHECK_TIMEOUT_MS);
  });
  return Promise.race([check(), timeout]).finally(() => clearTimeout(timer));
}

/**
 * /healthz — liveness: the process is up (no dependency checks, so a DB outage doesn't restart containers).
 * /readyz  — readiness: every dependency answers. Failure reasons are logged, never returned.
 */
export function healthRouter(checks: Record<string, ReadinessCheck>): Router {
  const router = Router();

  router.get("/healthz", (_req, res) => {
    const body: Liveness = { status: "ok" };
    res.json(body);
  });

  router.get("/readyz", async (req, res) => {
    const names = Object.keys(checks);
    const results = await Promise.allSettled(names.map((name) => withTimeout(checks[name]!)));

    const report: Readiness["checks"] = {};
    results.forEach((result, i) => {
      const name = names[i]!;
      report[name] = result.status === "fulfilled" ? "ok" : "error";
      if (result.status === "rejected")
        req.log.warn({ err: result.reason, check: name }, "readiness check failed");
    });

    const ready = results.every((r) => r.status === "fulfilled");
    const body: Readiness = { status: ready ? "ok" : "error", checks: report };
    res.status(ready ? 200 : 503).json(body);
  });

  return router;
}
