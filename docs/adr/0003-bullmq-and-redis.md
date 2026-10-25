# 0003 — BullMQ on Redis for background jobs

**Status:** Accepted

## Context

Emails, notification fan-out, bulk imports, and report exports must not run inside API requests. A Postgres-based queue (pg-boss) was considered to avoid running Redis; BullMQ was chosen for its maturity, retry/backoff controls, scheduling, and tooling.

## Decision

- BullMQ for all background jobs, processed by the `worker` entrypoint.
- Redis also backs rate limiting (`rate-limiter-flexible`) and short-lived caches (e.g. resolved AccessScope).
- At launch, Redis runs as a container on the EC2 host with AOF persistence, a password, and no public port. Move to ElastiCache when the host is split.

## Consequences

- One more service to run; mitigated by keeping it containerised with persistence and health checks.
- Jobs must be idempotent and carry IDs, not full records, so retries are safe.
- Redis is not a source of truth: losing it may delay jobs or drop caches, never lose business data.
