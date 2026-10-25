---
paths:
  - "gyra/backend/prisma/**"
  - "**/*.sql"
  - "**/repositories/**"
---

# Database rules

- PostgreSQL. Primary keys are UUIDv7 (or ULID) — sortable and safe to expose.
- Every table has `created_at`, `updated_at` (`timestamptz`, UTC). Soft-delete (`deleted_at`) for user-facing entities that need audit history.
- Hierarchy (region → chapter → institute → project) is modelled with explicit foreign keys; denormalize `region_id`/`institute_id` onto hot child tables when it avoids deep joins for scope filtering.
- Index every foreign key and every column used in scope filters, sorting, or lookups. Prefer composite indexes matching real query shapes.
- Money: integer minor units + `currency` (ISO 4217). Never floats.
- Fields expected to change often (custom institute fields, project metadata, settings) go in a validated JSONB column instead of new columns. Validate JSONB with a Zod schema on write; add a GIN or expression index only for keys that are actually queried. Core relations (users, roles, hierarchy, finance, audit) stay as strict typed columns.
- Migrations are additive and backwards-compatible (expand → migrate → contract) so rolling deploys work.
- Large tables (audit logs, notifications, activity) need a retention/archival plan and cursor pagination.
- Seeds use synthetic data only — no real student, parent, or staff records.
