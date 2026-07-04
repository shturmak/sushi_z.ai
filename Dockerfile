# =============================================================================
# SushiChain — Multi-stage Dockerfile (Staging & Production)
# =============================================================================
# Build:   docker build -t sushichain-app --build-arg ENV=staging .
# Run:     docker run -p 3000:3000 --env-file .env.staging sushichain-app
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

# Install bun if lockfile is bun.lockb
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

# Build-time dependencies
RUN apk add --no-cache vips-dev build-base python3

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Install bun globally for build scripts
RUN npm i -g bun@${BUN_VERSION}

# Build argument determines which Prisma schema to use
ARG ENV=production
ENV NODE_ENV=production

# Generate Prisma client with correct schema
# Production/Staging: PostgreSQL schema
# Development: SQLite schema (handled locally, not in Docker)
RUN if [ "$ENV" = "production" ] || [ "$ENV" = "staging" ]; then \
      echo "Using PostgreSQL schema for ${ENV}..." && \
      bunx prisma generate --schema=prisma/schema.postgresql.prisma; \
    else \
      echo "Using SQLite schema..." && \
      bunx prisma generate; \
    fi

# Build Next.js
RUN bun run build

# Copy static assets into standalone output
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---------------------------------------------------------------------------
# Stage 3: Runner
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

ARG ENV=production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Runtime dependencies for sharp
RUN apk add --no-cache vips

# Install bun for runtime (migrations, seed)
RUN npm i -g bun@${BUN_VERSION}

# Set ownership
RUN mkdir -p /app && chown nextjs:nodejs /app

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy Prisma client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy Prisma schema files for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy seed file (for initial setup)
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.ts ./prisma/seed.ts

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ || exit 1

# Entry point: run migrations then start server
CMD ["sh", "-c", "bunx prisma migrate deploy --schema=prisma/schema.postgresql.prisma && node server.js"]