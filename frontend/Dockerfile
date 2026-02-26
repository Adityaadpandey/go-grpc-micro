# ── Stage 1: Dependencies ─────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args become env vars only at build time (non-sensitive defaults)
ARG NEXT_PUBLIC_APP_NAME=MicroMart
ARG NEXT_PUBLIC_APP_VERSION=1.0.0
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Provide a placeholder JWT_SECRET so the build doesn't throw
# The real secret is injected at runtime via environment variable
ENV JWT_SECRET=build-time-placeholder-replaced-at-runtime

RUN pnpm build

# ── Stage 3: Production runner ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create data directory for auth store (with correct ownership)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Copy only what's needed for production
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime env vars (injected via docker-compose/k8s)
# JWT_SECRET, GRAPHQL_URL, AUTH_STORE_PATH

CMD ["node", "server.js"]
