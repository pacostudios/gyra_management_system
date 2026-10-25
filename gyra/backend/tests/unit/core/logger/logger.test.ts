import { Writable } from "node:stream";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../../../src/app";
import { createLogger } from "../../../../src/core/logger/logger";

/** A logger that writes JSON lines into an array. */
function capturingLogger() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const logger = createLogger({ NODE_ENV: "test", LOG_LEVEL: "info" }, destination);
  return { logger, output: () => lines.join("") };
}

describe("logger redaction", () => {
  it("redacts sensitive keys at the top level and up to two levels deep", () => {
    const { logger, output } = capturingLogger();
    logger.info({ email: "a@school.org", token: "t0p" }, "top");
    logger.info({ user: { phone: "+15550001", password: "pw1" } }, "nested");
    logger.info({ body: { student: { dateOfBirth: "2012-01-01", lastName: "Doe" } } }, "deep");

    const logged = output();
    for (const value of ["a@school.org", "t0p", "+15550001", "pw1", "2012-01-01", "Doe"]) {
      expect(logged).not.toContain(value);
    }
    expect(logged).toContain("[redacted]");
  });

  it("drops database error fields that echo stored values", () => {
    const { logger, output } = capturingLogger();
    const cause = Object.assign(new Error("unique violation"), {
      detail: "Key (email)=(kid@school.org) already exists.",
    });
    const err = Object.assign(new Error("insert failed", { cause }), {
      meta: { target: "kid@school.org" },
    });
    logger.error({ err }, "failed");

    const logged = output();
    expect(logged).toContain("insert failed");
    expect(logged).not.toContain("kid@school.org");
  });
});

describe("request logging", () => {
  it("logs method, path and status but not the query string or headers", async () => {
    const { logger, output } = capturingLogger();
    const app = createApp({ logger, readinessChecks: {}, apiDocs: false });

    await request(app)
      .get("/api/v1/verify?token=abc123secret")
      .set("x-api-key", "key-should-not-log")
      .set("x-forwarded-for", "203.0.113.9")
      .set("cookie", "session=cookie-should-not-log");

    const logged = output();
    expect(logged).toContain('"path":"/api/v1/verify"');
    expect(logged).toContain('"statusCode":404');
    for (const value of [
      "abc123secret",
      "key-should-not-log",
      "203.0.113.9",
      "cookie-should-not-log",
    ]) {
      expect(logged).not.toContain(value);
    }
  });
});
