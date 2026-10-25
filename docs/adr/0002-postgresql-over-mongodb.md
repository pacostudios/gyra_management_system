# 0002 — PostgreSQL with Prisma (not MongoDB)

**Status:** Accepted

## Context

MongoDB was considered to avoid migrations as requirements change. The data, however, is strongly relational: a Region → Chapter → Institute → Project hierarchy, many-to-many role assignments, teacher/coach/student project membership, parent–child links, and finance records. The core security rule ("only data inside your scope") is a join plus filter on every query.

## Decision

- PostgreSQL (AWS RDS in production) accessed through Prisma.
- Fields expected to change often (custom institute fields, project metadata, settings) live in Zod-validated JSONB columns, so they can change without a migration.
- Core relations stay as strict typed columns with foreign keys.

## Consequences

- Schema changes go through Prisma migrations; Prisma generates the SQL, and migrations are reviewed by `db-reviewer`.
- Joins, constraints, and transactions are native — important for scope filtering, finance, and audit.
- RDS gives managed backups and point-in-time restore inside GYRA's AWS account (MoU Schedule C.2).
- Migrations must be backwards-compatible (expand → migrate → contract).
