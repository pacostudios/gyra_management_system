import type { ApiError } from "@gyra/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError, NotFoundError } from "./errors";

// body-parser error types: entity.parse.failed, entity.too.large, encoding.unsupported, charset.unsupported, …
const BODY_PARSER_ERROR_TYPE = /^(entity|encoding|charset|request|stream)\./;

/** Errors thrown by express.json() carry an HTTP status and a `type`. */
function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof err.status === "number" &&
    "type" in err &&
    typeof err.type === "string" &&
    BODY_PARSER_ERROR_TYPE.test(err.type)
  );
}

/**
 * Only AppErrors and body-parser errors reach the client as 4xx. Anything else, including a bare
 * ZodError from internal code, is a server bug: 500 with no details. Request validation wraps its
 * Zod errors in ValidationError.fromZod().
 */
function toResponse(err: unknown): { status: number; body: ApiError } {
  if (err instanceof AppError) {
    const error: ApiError["error"] = { code: err.code, message: err.message };
    if (err.details !== undefined) error.details = err.details;
    return { status: err.status, body: { error } };
  }
  if (isBodyParserError(err) && err.status >= 400 && err.status < 500) {
    if (err.type === "entity.too.large") {
      return {
        status: 413,
        body: { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" } },
      };
    }
    return {
      status: 400,
      body: { error: { code: "BAD_REQUEST", message: "Malformed request body" } },
    };
  }
  // Never expose internal messages or stack traces to clients.
  return {
    status: 500,
    body: { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
  };
}

export const notFoundHandler: RequestHandler = () => {
  throw new NotFoundError("Route not found");
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // A response already in progress can't be replaced; let Express close the connection.
  if (res.headersSent) return next(err);

  const { status, body } = toResponse(err);
  if (status >= 500) req.log.error({ err }, "unhandled error");
  res.status(status).json(body);
};
