# Architecture

How the GYRA Management System is put together. Decisions behind it are in [adr/](adr/).

## 1. System overview

```
                     ┌──────────────┐        ┌──────────────┐
  Browser ──────────►│ frontend     │──/api─►│ backend      │──jobs──► worker (BullMQ)
                     │ Next.js      │        │ Express      │             │
                     └──────────────┘        └──┬───┬───┬───┘             │
                                                │   │   │                 │
                              ┌─────────────────┘   │   └─────────┐       │
                              ▼                     ▼             ▼       ▼
                        PostgreSQL               Redis           S3      SES (email)
                   (data, sessions, audit)  (queue, rate limits,  (files)
                                              caches)

  Browser ── presigned PUT/GET ──► S3   (file bytes never pass through the backend)
```

| Service    | Built from                   | Role                                                    |
| ---------- | ---------------------------- | ------------------------------------------------------- |
| `frontend` | `gyra/frontend/Dockerfile`   | Next.js server: pages, server components                |
| `backend`  | `gyra/backend/Dockerfile`    | REST API under `/api/v1`, Better Auth under `/api/auth` |
| `worker`   | backend image, other command | BullMQ job processing                                   |
| `migrate`  | backend image, one-off       | Runs Prisma migrations, then exits                      |
| `postgres` | postgres image               | Database (RDS in production)                            |
| `redis`    | redis image                  | Queue, rate limits, caches                              |
| `storage`  | rustfs image (deferred)      | Local stand-in for S3, added with the files module      |
| `mailpit`  | mailpit image                | Local inbox that catches all outgoing email             |

The frontend forwards `/api/*` to the backend, so the browser sees one origin (no CORS, first-party session cookie). In production a reverse proxy (Caddy or a load balancer) will take over that routing — deferred.

## 2. Request flows

**Page load (server-rendered)**

```
Browser → frontend (Server Component)
  → backend /api/v1/... (server-to-server, session cookie forwarded)
  → AccessScope resolved → scoped query → JSON → HTML streamed to browser
```

**Client interaction**

```
Browser (TanStack Query) → frontend /api/* → backend /api/v1/... → same path as above
```

**Backend request pipeline**

```
request-id → pino-http → helmet → rate limit (Redis)
  → Better Auth session lookup → resolve AccessScope (Redis cache, 5 min)
  → authorize({ roles, scope }) → Zod validate params/query/body
  → controller → service → repository (scope-filtered Prisma query)
  → audit event (for writes) → response
  → central error handler → { error: { code, message, details? } }
```

## 3. Authentication & authorization

- **Authentication** — Better Auth: email/password, sessions in Postgres (httpOnly cookie), password reset, email verification, TOTP 2FA for admin roles. ([ADR 0004](adr/0004-better-auth.md))
- **Invitations** — our own flow: admin invites → hashed single-use token emailed (via worker) → user sets password → role assignment created.
- **Authorization** — `role_assignments(user, role, scope_type, scope_id)`; per-request **AccessScope** of reachable IDs; repositories require it. ([ADR 0006](adr/0006-hierarchical-access-scope.md))

Hierarchy:

```
GYRA (global)
 └─ Region
     └─ Sub-region (entity; optional/required TBD)
         └─ Chapter
             └─ Institute
                 └─ Project / Unit
                      ├─ Teachers, Coaches (assignments)
                      └─ Students ── Parents (parent_links, read-only)
```

## 4. Background jobs (BullMQ)

| Queue           | Jobs                                                                  |
| --------------- | --------------------------------------------------------------------- |
| `email`         | invite, password reset, notification digests                          |
| `notifications` | fan-out of announcements to every recipient in scope                  |
| `imports`       | one-time CSV import of users/institutes (validate → preview → commit) |
| `reports`       | CSV/PDF exports for dashboards and finance                            |
| `maintenance`   | cleanup of expired invites/sessions, orphaned uploads                 |

Rules: jobs are idempotent, carry IDs not records, have explicit retry/backoff, and log with the originating request ID.

## 5. Notifications (polling)

- In-app notifications are rows in `notifications` (recipient, type, payload JSONB, read_at).
- The frontend polls `GET /api/v1/notifications/unread-count` every 30–60 s (paused when the tab is hidden) and fetches the list on demand.
- The count endpoint is a single indexed query, cached briefly in Redis per user.
- Email notifications go through the `email` queue.

## 6. Files

```
1. frontend → backend: POST /files/upload-url {projectId, name, size, type}
2. backend: authorize + scope check + type/size limits → presigned PUT (5 min) + pending file row
3. browser → S3: PUT file
4. frontend → backend: POST /files/:id/complete → backend verifies object exists → status = ready
5. download: backend checks scope → presigned GET (short-lived)
```

Orphaned pending uploads are cleaned up by the `maintenance` queue.

## 7. Data

- PostgreSQL via Prisma; UUIDv7 IDs; `timestamptz` in UTC; money as integer minor units + currency.
- Flexible attributes in Zod-validated JSONB columns; core relations as strict columns. ([ADR 0002](adr/0002-postgresql-over-mongodb.md))
- Append-only `audit_events` table.
- Backups: RDS automated backups + point-in-time restore; S3 versioning.

## 8. Running the project

All commands run from the `gyra/` folder.

**Docker dev mode (default)** — everything in containers, live reload on save:

```bash
cd gyra
cp .env.example .env          # first time only
docker compose up --watch     # postgres, redis, mailpit → migrate → backend, worker, frontend
```

Compose files:

| File                   | Loaded                                    | Contains                                                                                      |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `compose.yml`          | everywhere                                | base services (redis; later the app services), no host ports                                  |
| `compose.override.yml` | automatically by `docker compose` locally | local stand-ins (postgres for RDS, mailpit for SES), host ports on 127.0.0.1, watch settings  |
| `compose.prod.yml`     | only on the server, via `-f`              | restart always, log rotation; no published ports                                              |

Uses [Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/) instead of plain bind mounts, because Windows file-change events don't reach Linux containers through bind mounts:

| You change                        | Compose does                    | Result                                 |
| --------------------------------- | ------------------------------- | -------------------------------------- |
| `frontend/src/**`                 | syncs file into the container   | Next.js hot-reloads the page           |
| `backend/src/**`, `shared/src/**` | syncs file into the container   | backend + worker restart (`tsx watch`) |
| `backend/prisma/schema.prisma`    | syncs + restarts backend        | regenerated Prisma client              |
| any `package.json`, lockfile      | rebuilds that image             | new dependencies installed             |

Database and Redis data live in named volumes and survive restarts.

- App: http://localhost:3000
- API: http://localhost:4000 — Swagger UI at http://localhost:4000/api/docs
- Mailpit (see sent emails): http://localhost:8025

If a host port is already taken (e.g. a Redis running in WSL), change it in `.env` (`REDIS_PORT=6380`); containers still talk to each other on the default ports.

**Server** — built images, no watching, no override file. The server's `.env` comes from Secrets Manager / SSM:

```bash
docker compose -f compose.yml -f compose.prod.yml up -d --wait
```

**Host mode (optional)** — apps on the host, services in Docker:

```bash
docker compose up -d --wait   # postgres, redis, mailpit
pnpm dev
```

**Checks**

```bash
pnpm lint                          # ESLint
pnpm typecheck                     # TypeScript, every package
pnpm test                          # all tests
pnpm check                         # all three
pnpm --filter @gyra/backend test   # one package only
```

**Other commands**

```bash
pnpm db:migrate           # create/apply a migration
pnpm db:seed              # load synthetic data
docker compose down       # stop everything (data kept)
docker compose down -v    # stop and wipe local data
```

## 9. Testing

| Kind            | Tool                     | Location                     | Needs              |
| --------------- | ------------------------ | ---------------------------- | ------------------ |
| Unit            | Vitest                   | `<package>/tests/unit/`      | nothing            |
| API integration | Vitest + Supertest       | `backend/tests/integration/` | Postgres + Redis   |
| Components      | Vitest + Testing Library | `frontend/tests/components/` | nothing            |
| Shared          | Vitest                   | `shared/tests/`              | nothing            |
| End-to-end      | Playwright               | `e2e/tests/`                 | full stack running |

- `tests/` mirrors `src/`, so a test is easy to find from the code it covers.
- Every backend endpoint gets a **forbidden-scope** integration test.
- Test data comes from `backend/tests/factories/` (synthetic only). `backend/tests/helpers/` provides `asUser(role, scope)` for authenticated requests.
- Features ship with tests; quick fixes may skip them. Tests never block commits or pushes — the pre-commit hook runs only lint + format.

## 10. Environments

| Env        | Where                                        | Data                                                              |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------- |
| local      | Docker Compose on the dev machine            | Seeded synthetic data                                             |
| staging    | Same images on the server, separate database | Synthetic data; used for UAT (MoU 5.1)                            |
| production | EC2 + RDS + S3 + SES                         | Real data (only after MoU 6.2 data-handling schedule is approved) |

AWS region: to be finalised before the first deploy.

## 11. Folder structure

The repository root holds project notes only; all code is inside `gyra/`.

```
(repo root)
├── CLAUDE.md                             instructions for Claude
├── docs/                                 architecture.md, adr/, specs/, progress.md
├── Mou/                                  contract (gitignored)
├── .claude/                              skills, agents, rules
├── .gitignore
└── gyra/                                 ← the project
    ├── frontend/                         Next.js
    │   ├── src/
    │   │   ├── app/
    │   │   │   ├── (auth)/               signed-out pages
    │   │   │   │   ├── login/
    │   │   │   │   ├── forgot-password/
    │   │   │   │   ├── reset-password/
    │   │   │   │   └── accept-invite/
    │   │   │   ├── (app)/                signed-in shell (sidebar varies by role)
    │   │   │   │   ├── layout.tsx        checks session server-side
    │   │   │   │   ├── dashboard/
    │   │   │   │   ├── org/              regions, sub-regions, chapters
    │   │   │   │   ├── institutes/
    │   │   │   │   ├── projects/
    │   │   │   │   ├── users/
    │   │   │   │   ├── finance/
    │   │   │   │   ├── notifications/
    │   │   │   │   └── settings/
    │   │   │   ├── layout.tsx
    │   │   │   ├── error.tsx
    │   │   │   └── not-found.tsx
    │   │   ├── components/
    │   │   │   ├── ui/                   shadcn/ui primitives
    │   │   │   ├── data-table/           shared server-paginated table
    │   │   │   └── layout/               sidebar, header, page shell
    │   │   ├── features/                 per-module UI: components, forms, query hooks
    │   │   ├── lib/
    │   │   │   ├── api/                  typed API client (server + client variants)
    │   │   │   └── auth/                 Better Auth client, session helpers
    │   │   └── proxy.ts                  route guard: redirect signed-out users
    │   ├── tests/
    │   │   ├── unit/                     hooks, utils
    │   │   └── components/               component tests
    │   ├── public/
    │   ├── Dockerfile
    │   ├── next.config.ts                standalone output, /api rewrite to backend
    │   └── package.json
    │
    ├── backend/                          Express API + BullMQ worker
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   ├── migrations/
    │   │   └── seed.ts                   synthetic data only
    │   ├── src/
    │   │   ├── server.ts                 HTTP entrypoint (graceful shutdown)
    │   │   ├── worker.ts                 BullMQ entrypoint
    │   │   ├── app.ts                    builds the Express app (used by server + tests)
    │   │   ├── routes.ts                 mounts all module routers under /api/v1
    │   │   ├── config/env.ts             Zod-validated environment variables
    │   │   ├── docs/                     Swagger/OpenAPI only (kept out of route files)
    │   │   │   ├── openapi.ts            assembles the document
    │   │   │   ├── components.ts         shared schemas + standard error responses
    │   │   │   ├── paths/                one <module>.paths.ts per module
    │   │   │   └── docs.router.ts        /api/docs (UI) + /api/docs/openapi.json
    │   │   ├── core/                     cross-cutting infrastructure
    │   │   │   ├── auth/                 Better Auth instance + session middleware
    │   │   │   ├── authz/                AccessScope resolver, authorize() middleware
    │   │   │   ├── db/                   Prisma client, transaction helper
    │   │   │   ├── redis/                Redis client
    │   │   │   ├── queue/                queue definitions, enqueue helpers
    │   │   │   ├── http/                 errors, error handler, validate(), pagination
    │   │   │   ├── audit/                audit event writer
    │   │   │   ├── storage/              S3 presigned URL helpers
    │   │   │   ├── mail/                 SES sender + React Email templates
    │   │   │   └── logger/               pino setup, redaction
    │   │   └── modules/                  one folder per domain module
    │   │       ├── users/                users.routes / .controller / .service / .repository (.jobs)
    │   │       ├── invitations/
    │   │       ├── org/                  regions, sub-regions, chapters
    │   │       ├── institutes/
    │   │       ├── projects/
    │   │       ├── tasks/
    │   │       ├── files/
    │   │       ├── notifications/
    │   │       ├── finance/
    │   │       ├── dashboards/
    │   │       └── audit/
    │   ├── tests/
    │   │   ├── unit/                     services and helpers, no DB
    │   │   ├── integration/              endpoints via Supertest, real Postgres/Redis
    │   │   ├── factories/                synthetic data builders
    │   │   ├── helpers/                  asUser(role, scope) → authenticated agent
    │   │   └── setup.ts                  test DB + Redis lifecycle
    │   ├── Dockerfile
    │   ├── vitest.config.ts
    │   └── package.json
    │
    ├── shared/                           @gyra/shared — used by frontend and backend
    │   ├── src/
    │   │   ├── schemas/                  Zod request/response schemas per module
    │   │   ├── constants/                roles, scope types, permissions, limits
    │   │   ├── types/
    │   │   └── index.ts
    │   ├── tests/
    │   ├── vitest.config.ts
    │   └── package.json
    │
    ├── e2e/                              Playwright (needs the full stack running)
    │   ├── tests/
    │   └── playwright.config.ts
    │
    ├── scripts/                          dev helpers (db reset, wait-for-services)
    ├── .husky/                           git hooks (lint + format, commit message)
    ├── compose.yml                       base services (all environments)
    ├── compose.override.yml              local only: postgres, mailpit, host ports (auto-loaded)
    ├── compose.prod.yml                  server only: restart policy, log rotation
    ├── .env.example                      every variable, no real values
    ├── package.json                      scripts: dev, lint, typecheck, test, check, db:*
    ├── pnpm-workspace.yaml               frontend, backend, shared, e2e
    ├── tsconfig.base.json                base TypeScript settings
    ├── eslint.config.js
    ├── commitlint.config.js
    ├── .prettierrc / .prettierignore
    ├── .editorconfig / .gitattributes / .nvmrc
    └── pnpm-lock.yaml
```

### Why this shape

- **Code in `gyra/`, notes in the root** — the repo root stays free for docs, the contract, and scratch files.
- **`frontend/` and `backend/`** — the two halves of the product are obvious at a glance.
- **`shared/`** — one Zod schema validates the form in the browser and the request in the backend; role names and limits are identical on both sides.
- **pnpm workspace** — one `pnpm install`, one `pnpm dev`; `shared` is linked locally, so edits apply instantly.
- **`tests/` next to `src/`** — tests are separate from code but mirror it, so they're easy to find.
- **`app.ts` separate from `server.ts`** — tests import the app without opening a port.
- **`core/` vs `modules/`** — infrastructure is written once; every module has the same files.
- **`features/` in frontend** — keeps module UI out of the route folders; route files stay thin.

## 12. Scaffold plan (each slice reviewed and committed separately)

Current focus is **frontend and backend**, runnable locally and in Docker.

| Slice | Contents                                                                                                                                                    | Check                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| S1    | Root tooling (pnpm workspace, TS, ESLint, Prettier, Husky, commitlint), folder structure, test folders, Vitest in `shared`                                  | `pnpm check` — done                                                 |
| S2    | `gyra/compose.yml` with postgres, redis, storage, mailpit (+ healthchecks, named volumes)                                                                     | `docker compose up -d`, all services healthy                        |
| S3    | `backend/` skeleton: env validation, logger, error handler, `/healthz` `/readyz`, Prisma init, Redis + BullMQ wiring, worker entrypoint, Vitest + Supertest | health tests pass against local services                            |
| S4    | `frontend/` skeleton: Next.js, Tailwind, shadcn init, root layout, `(auth)`/`(app)` placeholders, `/api` rewrite to backend, Vitest + Testing Library       | `pnpm dev`, page renders, `/api/healthz` reachable through frontend |
| S5    | `frontend/Dockerfile`, `backend/Dockerfile` (multi-stage, non-root), `migrate`/`backend`/`worker`/`frontend` services in `compose.yml`                      | fresh clone → `docker compose up --build` → app on :3000            |

After S5: write the specs for auth, org, institutes, and projects, then build modules.

**Deferred (before first deploy):** reverse proxy (Caddy or load balancer), production compose/ECS config, GitHub Actions CI/CD, AWS setup. No application code changes needed — the apps read all config from environment variables and expose health endpoints.
