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
- `gyra/compose.yml` holds services shared by every environment (redis, then `migrate` one-off, `backend`, `worker`, `frontend`) with no host ports. `compose.override.yml` is local-only (postgres, mailpit, 127.0.0.1 ports, watch). `compose.prod.yml` is server-only (restart always, log rotation). Never put local stand-ins or host ports in `compose.yml`.
- Services have healthchecks and `depends_on: condition: service_healthy` so one `up` command starts everything in order.
