# =========================
# 1️⃣ Build stage
# =========================
FROM node:20-bookworm-slim AS builder

# Install build dependencies for native modules (sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# ======== Install deps (cached layer) =======
# Copy only package files first for better layer caching
COPY src/package.json src/package-lock.json ./
RUN npm ci --prefer-offline --no-audit

# ======== Copy source and build =======
COPY src/common ./common/
COPY src/backend ./backend/
COPY src/frontend ./frontend/

# Build backend + frontend
RUN npm run build:prod

# =========================
# 2️⃣ Runtime stage
# =========================
FROM node:20-bookworm-slim

# ========= Metadata =========
LABEL maintainer="HA Download Manager"
LABEL description="Home Assistant Download Manager Add-on"

# ========= Environment =========
ENV NODE_ENV=production \
    TZ=UTC \
    NPM_CONFIG_LOGLEVEL=warn \
    NODE_OPTIONS="--max-old-space-size=512"

# ========= Install runtime dependencies =========
# Only install what's needed for sqlite3 at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src/dist

# ======= Install prod deps (cached layer) =======
COPY src/package.json src/package-lock.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit \
    && npm cache clean --force

# ======= Copy build output =======
COPY --from=builder /src/dist/backend ./backend/
COPY --from=builder /src/dist/frontend ./frontend/

# ======= Copy and prepare run script =======
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Home Assistant ingress
EXPOSE 3000

# Graceful shutdown
STOPSIGNAL SIGTERM

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["/run.sh"]
