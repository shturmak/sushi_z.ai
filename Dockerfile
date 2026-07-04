# =============================================================================
# SushiChain — Production Dockerfile
# =============================================================================
# The canonical schema is prisma/schema.prisma (PostgreSQL).
# No schema selection needed — prisma generate uses the default.
#
# Build:   docker build -t sushichain-app .
# Run:     docker run -p 3000:3000 --env-file .env.production sushichain-app
# =============================================================================

ARG NODE_VERSION=20
ARG BUN_VERSION=1.2.0

# ---------------------------------------------------------------------------
# Stage 1: Dependencies
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json bun.lockb* package-lock.json* ./
COPY bun.lockb* ./
RUN if [ -f bun.lockb ]; then \
      npm i -g bun@${BUN_VERSION} && bun install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm i; \
    fi

# ---------------------------------------------------------------------------
# Stage 2: Build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

RUN apk add --no-cache vips-dev build-base python3

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm i -g bun@${BUN_VERSION}

ENV NODE_ENV=production

# Generate Prisma client (canonical PostgreSQL schema)
RUN bunx prisma generate

# Build Next.js
RUN bun run build

COPY --from=builder /app/.next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---------------------------------------------------------------------------
# Stage 3: Runner
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

RUN apk add --no-cache vips
RUN npm i -g bun@${BUN_VERSION}

RUN mkdir -p /app && chown nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.ts ./prisma/seed.ts

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ || exit 1

# Entry point: run migrations then start server
CMD ["sh", "-c", "bunx prisma migrate deploy && node server.js"]