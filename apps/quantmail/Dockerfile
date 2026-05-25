FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy relevant packages
COPY packages/common/ ./packages/common/
COPY packages/auth/ ./packages/auth/
COPY packages/server-core/ ./packages/server-core/
COPY apps/quantmail/ ./apps/quantmail/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build TypeScript
RUN pnpm --filter @quant/quantmail typecheck

FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 quantmail

# Install pnpm for workspace
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy packages from builder
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/quantmail/ ./apps/quantmail/
COPY --from=builder /app/node_modules/ ./node_modules/

ENV NODE_ENV=production
ENV PORT=3001

USER quantmail

EXPOSE 3001

CMD ["node", "--loader", "ts-node/esm", "apps/quantmail/api-v2/app.ts"]
