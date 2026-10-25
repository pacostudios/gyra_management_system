# Progress

Status per step. Update at the end of every session.

| Step | Item                                                                 | Status                              |
| ---- | -------------------------------------------------------------------- | ----------------------------------- |
| 0    | CLAUDE.md, rules, ADRs, skills, review agents                        | Done                                |
| 1    | Open decisions                                                       | Partly decided (below)              |
| 2    | Architecture + folder structure ([architecture.md](architecture.md)) | Approved (frontend/backend/shared)  |
| 3.1  | S1: root tooling, folder structure in gyra/, test folders + Vitest   | Done — committed (05fc27f)          |
| 3.2  | S2: compose.yml with postgres, redis, mailpit (storage deferred)     | Done — committed (f86acad)          |
| 3.3  | S3: shared + backend skeleton, Swagger at /api/docs                  | Done — committed (c4ce9db, 44271a0) |
| 3.4  | S4: frontend skeleton                                                | Not started                         |
| 3.5  | S5: Dockerfiles + full stack in compose.yml                          | Not started                         |
| —    | Deployment (reverse proxy, CI/CD, AWS)                               | Deferred until before first deploy  |
| 4    | Specs for intermediate milestone: auth, org, institutes, projects    | Not started                         |
| 5+   | Modules (spec → plan → slices → review → staging)                    | Not started                         |

## Checkpoint — 2026-10-25 (tag `checkpoint-s3`, branch `development`)

- Working: `docker compose up --watch` from `gyra/` runs postgres, redis, mailpit, backend, worker; all healthy. Live reload on save verified. API on :4000, Swagger at `/api/docs`, `/readyz` ok.
- `pnpm check` passes: 37 backend tests (unit + integration), 6 shared tests.
- Branches: `main` = S1 only; `development` = S1–S3 (pushed). Not merged to `main` yet.
- Local notes: Redis host port is 6380 in `gyra/.env` (a WSL Redis holds 6379). `.env` deny rules were removed from `.claude/settings.local.json` for now; restore `Read(./.env)` and `Read(./.env.*)` before real keys go in.
- **Next:** S4 — frontend skeleton (Next.js, Tailwind, shadcn, `(auth)`/`(app)` placeholders, `/api` rewrite to backend, Vitest + Testing Library, dev Docker stage + watch).

## Decisions

- **Notifications:** polling. No real-time push. (2026-10-25)
- **Sub-region:** its own entity/level in the hierarchy. Details (fields, whether every region has one) to be specified later. (2026-10-25)
- **Local dev in Docker:** `docker compose up --watch` (Compose Watch syncs saved files into containers; plain bind mounts miss Windows file events). Host `pnpm dev` stays optional. (2026-10-25)
- **Local S3 stand-in:** deferred until the files module. MinIO no longer publishes images; RustFS is the likely replacement. Production uses Amazon S3. (2026-10-25)
- **API docs:** Swagger UI at `/api/docs`, generated from the shared Zod schemas. Docs live in `backend/src/docs/` (one `paths/<module>.paths.ts` per module), not in route files. On by default except in production; `API_DOCS_ENABLED` overrides (e.g. staging). (2026-10-25)
- **Backend versions:** Express 5, Prisma 7 (driver adapter `@prisma/adapter-pg`, client generated to `src/generated/`), BullMQ 6 + ioredis 6, Zod 4. (2026-10-25)

## Open

- **AWS region** for data hosting — finalise before first deploy; depends on where most users are and the MoU 6.6 privacy review.
- **Sub-region details** — required vs optional level under a region.
- **Security follow-ups from the S3 review** (deferred to the slice that introduces the dependency):
  - Reverse proxy: always set `X-Request-Id` itself; expose only `/healthz` publicly (keep `/readyz` internal); `app.set("trust proxy", 1)` before rate limiting.
  - Auth: put `/api/docs` behind an admin session (or proxy IP allowlist) when enabled on staging.
  - Before production: Redis ACL user for BullMQ with dangerous commands disabled; `rds.force_ssl=1` on RDS.
