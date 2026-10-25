---
paths:
  - "**/Dockerfile*"
  - "**/docker-compose*.yml"
  - "**/compose*.yml"
  - "gyra/compose.yml"
---

# Docker rules

- Multi-stage builds: deps → build → slim runtime. Pin base image versions (e.g. `node:24-alpine` with a specific minor), never `latest`.
- Run as a non-root user. Copy only built output and production dependencies into the final stage.
- Next.js uses `output: "standalone"` for a minimal runtime image.
- Two images: `frontend` and `backend`, built with the repo root as context so `shared/` is included. The `worker` and `migrate` services reuse the `backend` image with a different command, so it scales separately without a third build.
- In production, Redis runs as a container with AOF persistence, a password, and no public port.
- Add `HEALTHCHECK` using the app's health endpoints.
- `.dockerignore` excludes `node_modules`, `.env*`, `.git`, test artifacts.
- No secrets baked into images or build args; inject at runtime.
- Root `compose.yml` runs the full local stack: postgres, redis, minio, mailpit, then `migrate` (one-off), `backend`, `worker`, `frontend`. Services have healthchecks and `depends_on: condition: service_healthy` so `docker compose up --build` works in one step.
