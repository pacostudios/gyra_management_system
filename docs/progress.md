# Progress

Status per step. Update at the end of every session.

| Step | Item                                                                 | Status                             |
| ---- | -------------------------------------------------------------------- | ---------------------------------- |
| 0    | CLAUDE.md, rules, ADRs, skills, review agents                        | Done                               |
| 1    | Open decisions                                                       | Partly decided (below)             |
| 2    | Architecture + folder structure ([architecture.md](architecture.md)) | Approved (frontend/backend/shared) |
| 3.1  | S1: root tooling, folder structure in gyra/, test folders + Vitest   | Done — committed (05fc27f)         |
| 3.2  | S2: compose.yml with postgres, redis, mailpit (storage deferred)     | Done                               |
| 3.3  | S3: shared + backend skeleton                                        | Not started                        |
| 3.4  | S4: frontend skeleton                                                | Not started                        |
| 3.5  | S5: Dockerfiles + full stack in compose.yml                          | Not started                        |
| —    | Deployment (reverse proxy, CI/CD, AWS)                               | Deferred until before first deploy |
| 4    | Specs for intermediate milestone: auth, org, institutes, projects    | Not started                        |
| 5+   | Modules (spec → plan → slices → review → staging)                    | Not started                        |

## Decisions

- **Notifications:** polling. No real-time push. (2026-10-25)
- **Sub-region:** its own entity/level in the hierarchy. Details (fields, whether every region has one) to be specified later. (2026-10-25)
- **Local dev in Docker:** `docker compose up --watch` (Compose Watch syncs saved files into containers; plain bind mounts miss Windows file events). Host `pnpm dev` stays optional. (2026-10-25)
- **Local S3 stand-in:** deferred until the files module. MinIO no longer publishes images; RustFS is the likely replacement. Production uses Amazon S3. (2026-10-25)

## Open

- **AWS region** for data hosting — finalise before first deploy; depends on where most users are and the MoU 6.6 privacy review.
- **Sub-region details** — required vs optional level under a region.
