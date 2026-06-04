# =========================
# 1. BUILD STAGE
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# install ALL deps (incl. dev) so `nest build` can run
COPY package*.json ./
RUN npm ci

# copy source + build.
# `nest build` also copies src/shared/proto/**/*.proto into dist/src/shared/proto
# (see nest-cli.json "assets"). That is the path main.ts actually loads from:
# join(__dirname=dist/src, '../src/shared/proto/...') -> dist/src/shared/proto/...
COPY . .
RUN npm run build


# =========================
# 2. RUNNER STAGE
# =========================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# run as non-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# production deps only
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# compiled output. dist/src/shared/proto/**/*.proto is bundled here by nest build
# and is the path main.ts resolves at runtime — this is the CRITICAL gRPC artifact.
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# drizzle migration config (migrations are run manually on the VPS).
# NOTE: there is no top-level ./drizzle migrations dir in the repo yet; when one is
# added (drizzle.config.ts `out: './drizzle'`), also copy it here:
#   COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# raw proto sources too, mirrored at /app/src/shared/proto, as a belt-and-braces
# fallback so the 8 protos exist under BOTH dist/src/... and src/... layouts.
COPY --from=builder --chown=nodejs:nodejs /app/src/shared/proto ./src/shared/proto

USER nodejs

# gRPC-only service: no HTTP server is started, so there is NO HTTP healthcheck.
# Liveness on the VPS is a "container is Running" check (see deploy.yaml); a TCP
# probe against 50054 is the alternative if a compose healthcheck is desired.
EXPOSE 50054

CMD ["node", "dist/src/main.js"]
