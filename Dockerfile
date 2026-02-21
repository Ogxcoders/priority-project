# ============================================================
# Priority Commander — Production Dockerfile for Coolify
# ============================================================
# COOLIFY SETTINGS:
#   Build Pack: Dockerfile
#   Port Exposes: 3000
#   Domain: https://project.trendss.net
#   Health Check: Disabled (or set path to / with port 3000)
# ============================================================

# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY package-lock.json* ./
RUN npm install --legacy-peer-deps && npm cache clean --force

# ── Stage 2: Build the application ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Appwrite config baked into client bundle at build time
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT="https://login.trendss.net/v1"
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID="69986d6b00089ab44a8d"
ARG NEXT_PUBLIC_APPWRITE_DATABASE_ID="priority-commander"

ENV NEXT_PUBLIC_APPWRITE_ENDPOINT=$NEXT_PUBLIC_APPWRITE_ENDPOINT
ENV NEXT_PUBLIC_APPWRITE_PROJECT_ID=$NEXT_PUBLIC_APPWRITE_PROJECT_ID
ENV NEXT_PUBLIC_APPWRITE_DATABASE_ID=$NEXT_PUBLIC_APPWRITE_DATABASE_ID
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/cache-handler.js ./cache-handler.js

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# NO HEALTHCHECK here — Coolify manages its own healthcheck
# Disable healthcheck in Coolify UI or set it to http://127.0.0.1:3000

CMD ["node", "server.js"]
