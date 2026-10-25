# 0006 — Role assignments + AccessScope for authorization

**Status:** Accepted

## Context

Users must only see data within their position in the GYRA → Region → (Sub-region) → Chapter → Institute → Project hierarchy, enforced at API level (MoU 2.1 item 12, 6.3). People can hold several roles at several levels.

## Decision

- `role_assignments(user_id, role, scope_type, scope_id)` — many per user. `scope_type` ∈ GLOBAL, REGION, SUB_REGION, CHAPTER, INSTITUTE, PROJECT.
- `parent_links(parent_user_id, student_user_id)` for the parent portal (read-only).
- `region_id` / `chapter_id` are denormalised onto institutes and projects for fast filtering.
- Each request resolves an **AccessScope** (reachable IDs per level), cached in Redis for a few minutes and invalidated on any role change.
- Repositories take AccessScope as a required argument and apply it to every query. Routes declare allowed roles via `authorize({ roles, scope })`.

## Consequences

- Unscoped queries are structurally hard to write.
- Every endpoint needs a forbidden-scope test (another region/institute gets 404/403).
- Postgres row-level security can be added later on the most sensitive tables as defence in depth.
- Sub-region is its own entity (decided 2026-10-25). Whether it is required or optional under a region is still open; the schema should allow chapters to sit directly under a region until that is settled.
