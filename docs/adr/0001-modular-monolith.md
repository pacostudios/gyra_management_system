# 0001 — Modular monolith

**Status:** Accepted

## Context

One developer, 8-week fixed-price delivery, large expected user base. Microservices would multiply deployment, networking, and debugging work without a load profile that needs them.

## Decision

- Three deployables from one pnpm workspace: `frontend` (Next.js), `backend` (Express), `worker` (BullMQ, same image as `backend`, different entrypoint). Shared Zod schemas and constants live in `shared/`.
- Inside `backend`, code is split into domain modules (`auth`, `users`, `org`, `institutes`, `projects`, `tasks`, `files`, `notifications`, `finance`, `dashboards`, `audit`). Modules call each other only through service functions, never through each other's tables.
- All containers are stateless so they can be scaled horizontally.

## Consequences

- One codebase to reason about; shared types via `shared/` (`@gyra/shared`).
- A module can later be extracted into its own service if load demands it, because boundaries are enforced in code.
