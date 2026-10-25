import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "../../helpers/test-app";

describe("API docs", () => {
  it("serves the OpenAPI spec with every health endpoint", async () => {
    const res = await request(createTestApp({ apiDocs: true })).get("/api/docs/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    expect(Object.keys(res.body.paths)).toEqual(expect.arrayContaining(["/healthz", "/readyz"]));
    expect(res.body.components.schemas.ApiError).toBeDefined();
  });

  it("serves Swagger UI", async () => {
    const res = await request(createTestApp({ apiDocs: true })).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });

  it("is not mounted when disabled", async () => {
    const res = await request(createTestApp({ apiDocs: false })).get("/api/docs/openapi.json");
    expect(res.status).toBe(404);
  });
});
