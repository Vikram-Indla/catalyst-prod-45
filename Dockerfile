# ── Builder ────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g bun

# Package manager files
COPY package.json bun.lock ./

# Config files
COPY index.html ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.spaces.json ./

# Env
COPY .env ./

# Source
COPY scripts/ ./scripts/
COPY src/ ./src/
COPY public/ ./public/

RUN bun install --frozen-lockfile
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN bun run build

# ── Runner ─────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g serve && \
    addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

COPY --from=builder --chown=appuser:nodejs /app/dist ./dist

ENV PORT=8080
USER appuser
EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]