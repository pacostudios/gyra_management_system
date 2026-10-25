import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pinoHttp } from "pino-http";
import type { Logger } from "../logger/logger";

const REQUEST_ID_HEADER = "x-request-id";
// Accept an upstream ID only if it is short and safe to log.
// TODO(proxy): once the reverse proxy exists, have it always set this header so clients can't choose IDs.
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * Allowlist what is logged per request. The query string is dropped (verify/reset links carry tokens there),
 * and so are headers, which hold cookies, auth, and client IPs.
 */
const serializers = {
  req: (req: IncomingMessage & { id?: unknown }) => ({
    id: req.id,
    method: req.method,
    path: req.url?.split("?")[0],
    userAgent: req.headers["user-agent"],
  }),
  res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
};

/** Assigns every request an ID (reused from the proxy when valid), logs it, and returns it in X-Request-Id. */
export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    serializers,
    // pino-http wraps req/res before serializing; take the raw objects so the allowlist above applies.
    wrapSerializers: false,
    genReqId(req, res) {
      const incoming = req.headers[REQUEST_ID_HEADER];
      const id =
        typeof incoming === "string" && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    // Health probes run every few seconds; keep them out of the logs.
    autoLogging: { ignore: (req) => req.url === "/healthz" || req.url === "/readyz" },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  });
}
