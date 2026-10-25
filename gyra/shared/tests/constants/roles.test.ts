import { describe, expect, it } from "vitest";
import { ROLES, SCOPE_TYPES } from "../../src";

describe("ROLES", () => {
  it("has no duplicates", () => {
    expect(new Set(ROLES).size).toBe(ROLES.length);
  });

  it("includes every role named in the MoU", () => {
    expect(ROLES).toEqual(
      expect.arrayContaining([
        "REGIONAL_DIRECTOR",
        "SUB_REGIONAL_DIRECTOR",
        "COORDINATOR",
        "FINANCE_MANAGER",
        "TEACHER",
        "COACH",
        "STUDENT",
        "PARENT",
      ]),
    );
  });
});

describe("SCOPE_TYPES", () => {
  it("is ordered from widest to narrowest", () => {
    expect(SCOPE_TYPES).toEqual([
      "GLOBAL",
      "REGION",
      "SUB_REGION",
      "CHAPTER",
      "INSTITUTE",
      "PROJECT",
    ]);
  });
});
