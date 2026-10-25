import { pino, type DestinationStream, type Logger } from "pino";
import type { Env } from "../../config/env";

// Personal data and credentials (students are minors). Matched at the top level and up to two levels deep.
const SENSITIVE_KEYS = [
  "password",
  "newPassword",
  "currentPassword",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "email",
  "phone",
  "firstName",
  "lastName",
  "fullName",
  "dateOfBirth",
  "address",
];

const REDACT_PATHS = SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]);

// Database errors can echo the offending value, e.g. `Key (email)=(kid@school.org) already exists`.
const ERROR_FIELDS_WITH_VALUES = ["detail", "meta", "where", "query", "parameters"];

function serializeError(err: unknown): unknown {
  if (!(err instanceof Error)) return err;
  const serialized: Record<string, unknown> = pino.stdSerializers.err(err);
  for (const field of ERROR_FIELDS_WITH_VALUES) delete serialized[field];
  if (serialized.cause && typeof serialized.cause === "object") {
    serialized.cause = serializeError((err as { cause?: unknown }).cause);
  }
  return serialized;
}

/** `destination` is for tests that need to inspect log lines. */
export function createLogger(
  env: Pick<Env, "NODE_ENV" | "LOG_LEVEL">,
  destination?: DestinationStream,
): Logger {
  const options = {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    serializers: { err: serializeError },
    // Readable output in local dev; JSON everywhere else (CloudWatch parses it).
    ...(env.NODE_ENV === "development" && !destination && { transport: { target: "pino-pretty" } }),
  };
  return destination ? pino(options, destination) : pino(options);
}

export type { Logger };
