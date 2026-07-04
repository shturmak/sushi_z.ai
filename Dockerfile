# =============================================================================
# SushiChain — Multi-stage Dockerfile for Production
# =============================================================================
# Build:  docker build -t sushichain-app .
# Run:    docker run -p 3000:3000 --env-file .env sushichain-app
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Dependencies
# Install node_modules in a separate layer for caching
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
# If no package-lock.json exists (bun project), generate a lockfile via npm
RUN if [ ! -f package-lock.json ]; then npm i --package-lock-only; fi

RUN npm ci --only=production && \
    cp -R node_modules /tmp/prod-modules && \
    npm ci && \
    cp -R node_modules /tmp/dev-modules

# ---------------------------------------------------------------------------
# Stage 2: Build
# Generate Prisma client, run db push, build Next.js standalone
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (sharp needs vips on Alpine)
RUN apk add --no-cache vips-dev build-base python3

# Copy full node_modules from deps stage (dev + prod for build)
COPY --from=deps /tmp/dev-modules ./node_modules

# Copy source
COPY . .

# Install Prisma CLI globally for build-time use
RUN npm install -g prisma@$(node -e "console.log(require('./package.json').devDependencies?.prisma || require('./package.json').dependencies?.prisma || '6')")

# Generate Prisma client (PostgreSQL schema for Docker deployment)
RUN npx prisma generate --schema=prisma/schema.postgresql.prisma

# Build Next.js (output: "standalone" set in next.config.ts)
RUN npm run build

# After next build, copy static assets into standalone dir
# (matches the "build" script: next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/)
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---------------------------------------------------------------------------
# Stage 3: Runner (Production)
# Minimal image with only what's needed to run
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Install runtime dependencies for sharp
RUN apk add --no-cache vips

# Copy Prisma CLI for runtime migrations
RUN npm install -g prisma

# Set working directory ownership
RUN mkdir -p /app && chown nextjs:nodejs /app

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy generated Prisma client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy Prisma schema files for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Health check — hits the /api health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma && node server.js"]