# GYRA Management System

Web-based management and project-management platform for **GYRA (Global Young Researchers' Academy)**, a US 501(c)(3). Built by PACO Studios under the MoU in [Mou/MOU Draft_v1.1.pdf](Mou/MOU%20Draft_v1.1.pdf) — that document is the source of truth for scope, acceptance criteria, and exclusions.

International client, large user base expected (students, parents, teachers, coaches across many regions). Design every feature to be **stateless, paginated, indexed, and scope-filtered** from day one.

**Team:** one developer (the user) who directs and reviews; Claude writes the code. Production-ready, delivered fast, in small approved steps — see [Workflow](#workflow).

## Stack

Decisions and their reasons are recorded in [docs/adr/](docs/adr/).

| Area                     | Technology                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Language / runtime       | TypeScript (strict), Node.js 24 LTS, pnpm workspaces                                                                                 |
| Frontend                 | Next.js (App Router), React, Tailwind CSS, shadcn/ui, TanStack Table, TanStack Query, React Hook Form, Lucide, Recharts, date-fns-tz |
| Backend                  | Express, Better Auth (authentication), custom role + hierarchy authorization, Zod, pino                                              |
| Database                 | PostgreSQL via Prisma; JSONB columns for fields expected to change often                                                             |
| Queue / cache            | Redis + BullMQ (jobs), Redis-backed rate limiting and short-lived caches                                                             |
| Files / email            | Amazon S3 (presigned URLs), AWS SES + React Email                                                                                    |
| Security middleware      | helmet, cors, rate-limiter-flexible                                                                                                  |
| Testing                  | Vitest, Supertest, Playwright, k6 (load), faker (synthetic data)                                                                     |
| Code quality             | ESLint, Prettier, Husky + lint-staged, commitlint (Conventional Commits)                                                             |
| Containers               | Docker multi-stage images, Docker Compose (`compose.yml` at root)                                                                    |
| Deferred to deploy time  | Reverse proxy (Caddy or load balancer), GitHub Actions CI/CD → ECR                                                                   |
| Hosting (GYRA-owned AWS) | One EC2 instance (web, api, worker, redis containers), RDS PostgreSQL, S3, SES, CloudFront, CloudWatch, SSM/Secrets Manager          |
| Monitoring               | Sentry, uptime checks on health endpoints                                                                                            |
| Local dev services       | Postgres, Redis, MinIO (S3), Mailpit (email) via Docker Compose                                                                      |

Deferred until load or requirements demand them: ECS Fargate + ALB, ElastiCache, RDS read replica, Postgres row-level security, real-time push (notifications poll).

## Layout (to be scaffolded)

pnpm workspace. Full tree in [docs/architecture.md](docs/architecture.md#10-folder-structure).

The repository root holds only project notes; **all code lives in `gyra/`**. Run every pnpm/docker command from `gyra/`.

```
(root)            CLAUDE.md, docs/, Mou/ (gitignored), .claude/, misc notes
gyra/
  frontend/       Next.js
  backend/        Express API + BullMQ worker (same codebase, two entrypoints)
  shared/         @gyra/shared — Zod schemas, types, role/permission constants
  e2e/            Playwright
  compose.yml     full local stack
  package.json    workspace root scripts
docs/             architecture.md, specs/, adr/, progress.md
```

Running (from `gyra/`): `docker compose up --build` (whole app in Docker) or `pnpm dev` (services in Docker, apps on host with hot reload).

Checks (from `gyra/`): `pnpm lint`, `pnpm typecheck`, `pnpm test`, or all three with `pnpm check`.

## Tests

- Each package has a `tests/` folder mirroring `src/` (e.g. `backend/src/modules/institutes/` → `backend/tests/integration/institutes.test.ts`). End-to-end tests live in `gyra/e2e/tests/`.
  - `backend/tests/unit/` — pure logic (services, helpers), no DB
  - `backend/tests/integration/` — endpoints via Supertest against real Postgres/Redis
  - `backend/tests/factories/`, `backend/tests/helpers/` — synthetic data builders, `asUser(role, scope)`
  - `frontend/tests/unit/`, `frontend/tests/components/` — hooks/utils and component tests
  - `shared/tests/` — schema and constant tests
- **Features** ship with tests (including forbidden-scope tests for every endpoint), and Claude runs them before reporting work as done.
- **Quick fixes** (typos, styling, copy, config tweaks) may skip tests.
- Tests never block a commit or push. The pre-commit hook runs only lint + format on staged files.

## Domain model

Hierarchy: **GYRA → Region → (Sub-region) → Chapter → Institute → Project/Unit**.

Roles: Super Admin, Regional Director, Sub-Regional Director, Coordinator, Finance Manager, Institute Admin, Teacher, Coach, Student, Parent.

- Users can hold several **role assignments**, each `(role, scope_type, scope_id)`.
- Every request resolves an **AccessScope** (reachable region/chapter/institute/project IDs). Repositories require it and apply it to every query — no unscoped queries.
- Parents are read-only and reach data only through their linked children.
- Authorization is enforced **in the API**, never only in the UI. A changed URL or request body must never expose another scope's data (MoU 6.3).

## Scope guardrails (from the MoU)

In scope: user & access mgmt, org mgmt, institutes, projects/units, students & teachers, coaches, parent portal (view-only), in-app + email notifications, tasks/to-dos, files, role dashboards & reports, basic finance (record/view transactions + basic reports), audit logging, deployment & handover.

**Out of scope — do not build without a signed change order:** native mobile apps, payment gateways/online payments/invoicing/tax, SMS/WhatsApp, AI features, advanced analytics/BI, video conferencing, ERP/CRM/LMS integrations, IoT, multi-language UI, public website (thinkgyra.org) redesign/CMS.

If a request drifts into an excluded area, flag it before implementing.

## Non-negotiables

**Security & privacy (student data, minors)**

- Use Better Auth for credentials, sessions, reset, verification, and 2FA — don't hand-roll auth primitives.
- Session cookies httpOnly, Secure, SameSite. 2FA available for admin roles.
- Rate-limit auth and invite endpoints.
- Validate every input with Zod at the API boundary. Parameterized queries only.
- Audit-log key actions (who, what, scope, when) to an append-only table.
- No student/parent data in seeds, fixtures, screenshots, or logs — synthetic data only.
- Secrets only via environment/secret manager; never committed, never in docs.

**Scale**

- API and web containers are stateless; shared state lives in Postgres or Redis.
- All list endpoints are paginated (cursor-based for large tables) with a max page size.
- Index every foreign key and every scope/filter column; avoid N+1 queries.
- Slow or external work (email, notification fan-out, imports, report exports) goes to BullMQ.
- Files go directly to S3 via presigned URLs — never stream uploads through the API.

**International**

- Store timestamps in UTC (`timestamptz`); render in the user's timezone.
- English-only UI per MoU, but keep user-facing strings out of business logic.
- Money as integer minor units + ISO currency code.

## Conventions

- TypeScript `strict`. No `any` without a comment explaining why.
- Shared request/response schemas live in `shared/` (`@gyra/shared`); frontend and backend both import them.
- API errors use one shape: `{ error: { code, message, details? } }`.
- Schema changes only through Prisma migrations; never edit applied migrations.
- Conventional Commits (`feat:`, `fix:`, `chore:` …). Branch per module: `feat/<module>`.

## Workflow

Move carefully: small slices, explicit approval gates. Stop and wait for the user at every gate.

1. **Spec** — `docs/specs/<module>.md` (roles, screens, fields, endpoints, edge cases, acceptance tests). User approves before any code.
2. **Plan** — implementation plan for the module. User approves.
3. **Slices**, each reviewed and committed separately:
   - schema + migration → `db-reviewer`
   - API + authorization + tests → `security-reviewer`
   - UI + Playwright smoke test
4. **Close** — `scope-guard` against the MoU, update spec and `docs/progress.md`, merge, deploy to staging.

**Definition of done (features):** `pnpm check` passes (lint, typecheck, tests incl. forbidden-scope tests); no high/critical findings from review agents; migration backwards-compatible; spec matches what was built; deployed to staging.

## Project skills & agents

Skills in [.claude/skills/](.claude/skills/) (Next.js, React perf, Node backend, auth, Postgres, Docker, security, shadcn, Vitest, Playwright, UI guidelines). Load the relevant one before working in that area.

Subagents in [.claude/agents/](.claude/agents/):

- `scope-guard` — checks a feature/plan against MoU scope and exclusions.
- `security-reviewer` — reviews auth, RBAC/scope enforcement, and student-data handling.
- `db-reviewer` — reviews schema, migrations, and queries for correctness and scale.

Path-specific rules live in [.claude/rules/](.claude/rules/).
