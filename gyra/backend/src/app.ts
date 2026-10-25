import express, { type Express, type RequestHandler } from "express";
import helmet from "helmet";
import { docsRouter } from "./docs/docs.router";
import { healthRouter, type ReadinessCheck } from "./core/health/health.routes";
import { errorHandler, notFoundHandler } from "./core/http/error-handler";
import { requestLogger } from "./core/http/request-logger";
import type { Logger } from "./core/logger/logger";
import { apiRouter } from "./routes";

export interface AppDeps {
  logger: Logger;
  readinessChecks: Record<string, ReadinessCheck>;
  apiDocs: boolean;
}

/** API responses are JSON with student data: never cached, never rendered as a page. */
const jsonApiHeaders: RequestHandler = (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
};

/** Builds the Express app without listening, so tests can drive it with Supertest. */
export function createApp({ logger, readinessChecks, apiDocs }: AppDeps): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(requestLogger(logger));
  app.use(express.json({ limit: "100kb" }));

  app.use(healthRouter(readinessChecks));
  app.use("/api/v1", jsonApiHeaders, apiRouter());
  if (apiDocs) app.use("/api/docs", docsRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
