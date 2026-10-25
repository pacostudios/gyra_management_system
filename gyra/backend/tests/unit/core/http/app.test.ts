import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/test-app";

describe("app middleware", () => {
  it("sets security headers and hides the framework", async () => {
    const res = await request(createTestApp()).get("/healthz");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("generates a request ID", async () => {
    const res = await request(createTestApp()).get("/healthz");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("reuses a valid incoming request ID", async () => {
    const res = await request(createTestApp()).get("/healthz").set("x-request-id", "proxy-abc.123");
    expect(res.headers["x-request-id"]).toBe("proxy-abc.123");
  });

  it("replaces an unsafe incoming request ID", async () => {
    const res = await request(createTestApp())
      .get("/healthz")
      .set("x-request-id", "<script>alert(1)</script>");
    expect(res.headers["x-request-id"]).not.toContain("<");
  });
});

describe("/readyz", () => {
  it("returns 503 and names the failing check without leaking the reason", async () => {
    const app = createTestApp({
      readinessChecks: {
        database: async () => undefined,
        redis: async () => {
          throw new Error("ECONNREFUSED 10.0.0.5:6379");
        },
      },
    });
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "error", checks: { database: "ok", redis: "error" } });
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
  });
});

describe("/api/v1 responses", () => {
  it("are never cached and cannot be rendered as a page", async () => {
    const res = await request(createTestApp()).get("/api/v1/anything");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
  });
});
