/** Every role a user can be assigned. See docs/adr/0006-hierarchical-access-scope.md. */
export const ROLES = [
  "SUPER_ADMIN",
  "REGIONAL_DIRECTOR",
  "SUB_REGIONAL_DIRECTOR",
  "COORDINATOR",
  "FINANCE_MANAGER",
  "INSTITUTE_ADMIN",
  "TEACHER",
  "COACH",
  "STUDENT",
  "PARENT",
] as const;

export type Role = (typeof ROLES)[number];

/** Levels of the hierarchy a role assignment can be attached to, from widest to narrowest. */
export const SCOPE_TYPES = [
  "GLOBAL",
  "REGION",
  "SUB_REGION",
  "CHAPTER",
  "INSTITUTE",
  "PROJECT",
] as const;

export type ScopeType = (typeof SCOPE_TYPES)[number];
