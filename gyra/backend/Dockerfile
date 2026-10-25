# syntax=docker/dockerfile:1
# Build context is gyra/ (so shared/ is included): docker build -f backend/Dockerfile .
# Stages: base → deps → dev. The production runtime stage is added in S5.

FROM node:24.22.1-alpine3.24 AS base
ENV PNPM_HOME=/pnpm \
    COREPACK_HOME=/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0
ENV PATH=$PNPM_HOME:$PATH
# Install the pnpm version pinned in package.json at build time, so containers never download it.
COPY package.json /tmp/package.json
RUN corepack enable && corepack install -g "$(node -p "require('/tmp/package.json').packageManager")" \
    && chmod -R a+rX /corepack
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@gyra/backend..."

# Local development: source is synced in by Compose Watch; tsx restarts on change.
FROM deps AS dev
ENV NODE_ENV=development
COPY --chown=node:node tsconfig.base.json ./
COPY --chown=node:node shared shared
COPY --chown=node:node backend backend
RUN chown node:node /app/backend /app/shared
USER node
WORKDIR /app/backend
EXPOSE 4000
CMD ["pnpm", "dev"]
