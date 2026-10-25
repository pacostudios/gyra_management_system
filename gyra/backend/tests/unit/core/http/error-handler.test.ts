import { apiErrorSchema } from "@gyra/shared";
import express, { type Request, type Response } from "express";
import { pinoHttp } from "pino-http";
import { pino } from "pino";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorHandler, notFoundHandler } from "../../../../src/core/http/error-handler";
import { ForbiddenError, NotFoundError, ValidationError } from "../../../../src/core/http/errors";
import { createTestApp } from "../../../helpers/test-app";

function appThatThrows(err: unknown) {
  const app = express();
  app.use(pinoHttp({ logger: pino({ level: "silent" }) }));
  app.get("/boom", () => {
    throw err;
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("error handler", () => {
  it.each([
    [new NotFoundError(), 404, "NOT_FOUND"],
    [new ForbiddenError(), 403, "FORBIDDEN"],
    [new ValidationError([{ path: ["name"] }]), 400, "VALIDATION_ERROR"],
  ])("maps %o to %i %s", async (err, status, code) => {
    const res = await request(appThatThrows(err)).get("/boom");
    expect(res.status).toBe(status);
    expect(apiErrorSchema.parse(res.body).error.code).toBe(code);
  });

  it("includes details when present", async () => {
    const res = await request(appThatThrows(new ValidationError({ field: "name" }))).get("/boom");
    expect(res.body.error.details).toEqual({ field: "name" });
  });

  it("turns request Zod errors into 400 with field paths but not submitted values", async () => {
    const parsed = z.object({ age: z.number() }).safeParse({ age: "secret-value" });
    const res = await request(appThatThrows(ValidationError.fromZod(parsed.error!))).get("/boom");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].path).toEqual(["age"]);
    expect(JSON.stringify(res.body)).not.toContain("secret-value");
  });

  it("treats a bare Zod error as a server bug (500, no details)", async () => {
    const parsed = z.object({ internalColumn: z.string() }).safeParse({});
    const res = await request(appThatThrows(parsed.error)).get("/boom");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("internalColumn");
  });

  it("does not mistake other errors with status and type for body errors", async () => {
    const err = Object.assign(new Error("upstream"), { status: 404, type: "upstream.missing" });
    const res = await request(appThatThrows(err)).get("/boom");
    expect(res.status).toBe(500);
  });

  it("hands a response that has already started back to Express", () => {
    const err = new Error("failed mid-stream");
    const res = { headersSent: true, status: vi.fn() };
    const next = vi.fn();

    errorHandler(err, {} as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("hides internal error messages", async () => {
    const res = await request(appThatThrows(new Error("db password is hunter2"))).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
  });

  it("returns 404 in the standard shape for unknown routes", async () => {
    const res = await request(createTestApp()).get("/nope");
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(res.body).error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(createTestApp())
      .post("/api/v1/anything")
      .set("content-type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 413 for bodies over the limit", async () => {
    const res = await request(createTestApp())
      .post("/api/v1/anything")
      .set("content-type", "application/json")
      .send(JSON.stringify({ data: "x".repeat(200 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
