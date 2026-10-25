import { describe, expect, it } from "vitest";
import { parseEnv } from "../../../src/config/env";

const valid = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://:pass@localhost:6379",
};

const production = {
  ...valid,
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@db.example.com:5432/db?sslmode=verify-full",
};

describe("parseEnv", () => {
  it("applies defaults", () => {
    const env = parseEnv(valid);
    expect(env).toMatchObject({ PORT: 4000, LOG_LEVEL: "info", API_DOCS_ENABLED: true });
  });

  it("requires NODE_ENV instead of assuming development", () => {
    const { NODE_ENV: _omitted, ...withoutNodeEnv } = valid;
    expect(() => parseEnv(withoutNodeEnv)).toThrow(/NODE_ENV/);
  });

  it("silences logs in tests unless LOG_LEVEL is set", () => {
    expect(parseEnv({ ...valid, NODE_ENV: "test" }).LOG_LEVEL).toBe("silent");
    expect(parseEnv({ ...valid, NODE_ENV: "test", LOG_LEVEL: "debug" }).LOG_LEVEL).toBe("debug");
  });

  it("coerces PORT to a number", () => {
    expect(parseEnv({ ...valid, PORT: "8080" }).PORT).toBe(8080);
  });

  it("treats empty values as unset", () => {
    const env = parseEnv({ ...valid, PORT: "", API_DOCS_ENABLED: "" });
    expect(env.PORT).toBe(4000);
    expect(env.API_DOCS_ENABLED).toBe(true);
  });

  it("lists every missing variable", () => {
    expect(() => parseEnv({ NODE_ENV: "development" })).toThrow(/DATABASE_URL[\s\S]*REDIS_URL/);
  });

  it("rejects URLs with the wrong protocol", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
    expect(() => parseEnv({ ...valid, REDIS_URL: "http://localhost:6379" })).toThrow(/REDIS_URL/);
  });

  it("requires TLS to the database in production", () => {
    expect(() =>
      parseEnv({ ...production, DATABASE_URL: "postgresql://u:p@db.example.com:5432/db" }),
    ).toThrow(/DATABASE_URL: must set sslmode/);
    expect(() =>
      parseEnv({
        ...production,
        DATABASE_URL: "postgresql://u:p@db.example.com/db?sslmode=disable",
      }),
    ).toThrow(/sslmode/);
    expect(parseEnv(production).NODE_ENV).toBe("production");
  });

  it("enables API docs only in development unless set explicitly", () => {
    expect(parseEnv(production).API_DOCS_ENABLED).toBe(false);
    expect(parseEnv({ ...valid, NODE_ENV: "test" }).API_DOCS_ENABLED).toBe(false);
    expect(parseEnv({ ...production, API_DOCS_ENABLED: "true" }).API_DOCS_ENABLED).toBe(true);
  });

  it("does not echo values, which may be secrets", () => {
    expect(() => parseEnv({ ...valid, PORT: "not-a-port-s3cret" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("s3cret") }),
    );
  });
});
