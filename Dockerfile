# Multi-stage build for the Next.js app. Built for `docker compose build`
# (see docker-compose.yml) — not meant to be run standalone without a
# Postgres instance reachable at DATABASE_URL.

# ---- deps: install dependencies once, cached separately from source code ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the Next.js app ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# No real DATABASE_URL is needed to build — nothing queries the database at
# build time — but Next.js still wants *a* value present so pages that
# import the db client don't fail to evaluate during the build.
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/wots_orders"
RUN npm run build

# ---- runner: minimal image that just runs the compiled output ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user rather than the container's default root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# .next/standalone already contains a minimal server.js plus only the
# node_modules it needs (see next.config.ts's output: "standalone") —
# public/ and .next/static aren't included in that folder and have to be
# copied in separately.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
