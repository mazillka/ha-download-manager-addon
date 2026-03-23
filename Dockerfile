# =========================
# 1️⃣ Build stage
# =========================
FROM node:20-alpine AS builder

# Install alpine build dependencies for native modules (like better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /src

# Copy package.json and install dependencies
COPY src/package.json src/package-lock.json ./
RUN npm ci --no-audit --prefer-offline --build-from-source

# Copy source code
COPY src/common ./common/
COPY src/backend ./backend/
COPY src/frontend ./frontend/

# Build backend + frontend
RUN npm run build:prod

# Remove dev dependencies, scrub the npm cache, and entirely delete C++ build object files
RUN npm prune --omit=dev && \
    npm cache clean --force && \
    rm -rf node_modules/better-sqlite3/build/Release/obj.target

# =========================
# 2️⃣ Runtime stage
# =========================
FROM node:20-alpine

# Environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=256" \
    TZ=UTC \
    CHROME_BIN=/usr/bin/chromium-browser

WORKDIR /app

# Install tini and Alpine-native chromium (drastically smaller than playwright binaries)
RUN apk add --no-cache tini chromium tzdata

# Copy aggressively minified node_modules and builds
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/dist/backend ./backend/
COPY --from=builder /src/dist/frontend ./frontend/

# HA ingress
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=2s --start-period=10s \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Run script
COPY run.sh /run.sh
RUN sed -i 's/\r$//' /run.sh && chmod +x /run.sh

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/run.sh"]