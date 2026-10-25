import { describe, expect, it } from "vitest";
import { apiErrorSchema } from "../../src";

describe("apiErrorSchema", () => {
  it("accepts the standard error shape", () => {
    const body = { error: { code: "NOT_FOUND", message: "Not found" } };
    expect(apiErrorSchema.parse(body)).toEqual(body);
  });

  it("accepts optional details", () => {
    const body = {
      error: { code: "VALIDATION_ERROR", message: "Invalid input", details: [{ path: ["name"] }] },
    };
    expect(apiErrorSchema.safeParse(body).success).toBe(true);
  });

  it("rejects unknown codes", () => {
    const body = { error: { code: "SOMETHING_ELSE", message: "x" } };
    expect(apiErrorSchema.safeParse(body).success).toBe(false);
  });
});
