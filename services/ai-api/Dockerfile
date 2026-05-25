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
COPY packages/database/ ./packages/database/
COPY packages/ai/ ./packages/ai/
COPY packages/realtime/ ./packages/realtime/
COPY apps/quantai/ ./apps/quantai/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Compile TypeScript to JavaScript
RUN pnpm --filter @quant/common exec tsc -b && \
    pnpm --filter @quant/auth exec tsc -b && \
    pnpm --filter @quant/server-core exec tsc -b && \
    pnpm --filter @quant/database exec tsc -b && \
    pnpm --filter @quant/ai exec tsc -b && \
    pnpm --filter @quant/realtime exec tsc -b && \
    pnpm --filter @quant/quantai exec tsc --outDir dist

# Update main fields to point to compiled output for production runtime
RUN node -e " \
  const fs = require('fs'); \
  const pkgs = ['packages/common', 'packages/auth', 'packages/server-core', 'packages/database', 'packages/ai', 'packages/realtime']; \
  for (const pkg of pkgs) { \
    const p = pkg + '/package.json'; \
    const j = JSON.parse(fs.readFileSync(p, 'utf8')); \
    if (j.main && j.main.startsWith('src/')) { \
      j.main = j.main.replace('src/', 'dist/').replace('.ts', '.js'); \
    } \
    if (j.types && j.types.startsWith('src/')) { \
      j.types = j.types.replace('src/', 'dist/').replace('.ts', '.d.ts'); \
    } \
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\\n'); \
  } \
"

FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 quantai

# Install pnpm for production install
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy compiled output and updated package.json from builder
COPY --from=builder /app/packages/common/dist/ ./packages/common/dist/
COPY --from=builder /app/packages/common/package.json ./packages/common/package.json
COPY --from=builder /app/packages/auth/dist/ ./packages/auth/dist/
COPY --from=builder /app/packages/auth/package.json ./packages/auth/package.json
COPY --from=builder /app/packages/server-core/dist/ ./packages/server-core/dist/
COPY --from=builder /app/packages/server-core/package.json ./packages/server-core/package.json
COPY --from=builder /app/packages/database/dist/ ./packages/database/dist/
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/ai/dist/ ./packages/ai/dist/
COPY --from=builder /app/packages/ai/package.json ./packages/ai/package.json
COPY --from=builder /app/packages/realtime/dist/ ./packages/realtime/dist/
COPY --from=builder /app/packages/realtime/package.json ./packages/realtime/package.json
COPY --from=builder /app/apps/quantai/dist/ ./apps/quantai/dist/
COPY --from=builder /app/apps/quantai/package.json ./apps/quantai/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

ENV NODE_ENV=production
ENV PORT=3020

USER quantai

EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3020/health || exit 1

CMD ["node", "apps/quantai/dist/backend/app.js"]
