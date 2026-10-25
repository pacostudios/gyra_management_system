---
paths:
  - "gyra/backend/**"
---

# API (Express) rules

- Authentication is Better Auth (mounted under `/api/auth`). Don't reimplement sessions, password hashing, reset, or 2FA. Our own code handles authorization only.
- Layering: `routes → controllers → services → repositories`. Controllers handle HTTP only; services hold business rules; repositories are the only place that touches Prisma.
- Every route declares: auth requirement, allowed roles, and a scope resolver. Use the shared `authorize({ roles, scope })` middleware — never inline role checks in handlers.
- Repositories take the caller's scope as a required argument and apply it to every query.
- Validate `params`, `query`, and `body` with Zod schemas from `@gyra/shared` (`shared/`) before the controller runs.
- Use a central error handler; throw typed errors (`NotFoundError`, `ForbiddenError`, `ValidationError`). Return 404 rather than 403 when revealing existence would leak data across scopes.
- Security middleware: helmet, strict CORS allowlist, body size limits, Redis-backed rate limiting, request IDs.
- Structured JSON logging (pino) with request ID; redact auth headers, cookies, passwords, tokens, emails, phone numbers.
- Health endpoints: `/healthz` (liveness) and `/readyz` (DB + Redis reachable) for container orchestration.
- Graceful shutdown on SIGTERM: stop accepting requests, drain, close DB/Redis connections.
- Background work (email, notification fan-out, imports, report exports) is enqueued with BullMQ and processed by the worker entrypoint (`src/worker.ts`), never in the request cycle.
- Jobs are idempotent (safe to retry), have explicit retry/backoff settings, and carry IDs rather than full records in their payload.
