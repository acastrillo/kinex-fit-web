# Dockerfile for Kinex Fit

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
USER root
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
USER root
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Prepare production SQLite database for NextAuth (schema only)
RUN mkdir -p /tmp/prisma \
  && DATABASE_URL="file:/tmp/prisma/prod.db" npx prisma db push --skip-generate --accept-data-loss

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
USER root

ENV NODE_ENV=production

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs 2>/dev/null || true
RUN adduser --system --uid 1001 nextjs 2>/dev/null || true

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p /tmp/prisma && chown -R nextjs:nodejs /tmp/prisma
COPY --from=builder --chown=nextjs:nodejs /tmp/prisma/prod.db /tmp/prisma/prod.db

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
