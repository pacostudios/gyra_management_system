import { z } from "zod";

const SSL_MODES = ["require", "verify-ca", "verify-full"];

const envSchema = z
  .object({
    // Required: a forgotten NODE_ENV must not silently mean "development" (docs on, pretty logs).
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),
    // Swagger UI at /api/docs. On only in development unless explicitly enabled (e.g. staging).
    API_DOCS_ENABLED: z.stringbool().optional(),
  })
  .superRefine((env, ctx) => {
    // Student data crosses the network to RDS; production must use TLS.
    const sslMode = URL.canParse(env.DATABASE_URL)
      ? new URL(env.DATABASE_URL).searchParams.get("sslmode")
      : null;
    if (env.NODE_ENV === "production" && !SSL_MODES.includes(sslMode ?? "")) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: `must set sslmode to one of ${SSL_MODES.join(", ")} in production`,
      });
    }
  });

type ParsedEnv = z.infer<typeof envSchema>;

export type Env = ParsedEnv & {
  LOG_LEVEL: NonNullable<ParsedEnv["LOG_LEVEL"]>;
  API_DOCS_ENABLED: boolean;
};

/** Validates environment variables. Throws one error listing every problem, without echoing values (they may be secrets). */
export function parseEnv(source: Record<string, string | undefined>): Env {
  // Compose passes `VAR=` for unset `${VAR:-}`; treat empty strings as unset so defaults apply.
  const defined = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ""));
  const result = envSchema.safeParse(defined);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${problems.join("\n")}`);
  }
  const env = result.data;
  return {
    ...env,
    LOG_LEVEL: env.LOG_LEVEL ?? (env.NODE_ENV === "test" ? "silent" : "info"),
    API_DOCS_ENABLED: env.API_DOCS_ENABLED ?? env.NODE_ENV === "development",
  };
}
