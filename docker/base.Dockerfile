# === Base Dockerfile Template ===
# This documents the multi-stage pattern used by all Quant app Dockerfiles.
#
# Stage 1 (deps): Install all dependencies
# Stage 2 (build): Build the specific app using turbo
# Stage 3 (runner): Minimal runtime image

FROM node:22-slim AS deps
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY services/ ./services/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG APP_NAME
RUN pnpm turbo build --filter=${APP_NAME}

FROM node:22-slim AS runner
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 quantapp
WORKDIR /app
ENV NODE_ENV=production
USER quantapp
