import { pino } from "pino";
import { createApp, type AppDeps } from "../../src/app";

/** The real app with a silent logger. Pass readiness checks to control /readyz. */
export function createTestApp(overrides: Partial<AppDeps> = {}) {
  return createApp({
    logger: pino({ level: "silent" }),
    readinessChecks: {},
    apiDocs: false,
    ...overrides,
  });
}
