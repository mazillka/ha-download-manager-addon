# =========================
# 1️⃣ Build stage
# =========================
FROM node:20-bookworm-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    wget \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libgtk-3-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

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

# Remove dev dependencies
RUN npm prune --omit=dev

# =========================
# 2️⃣ Runtime stage
# =========================
FROM node:20-bookworm-slim

# Environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=256" \
    TZ=UTC

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    tini \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libgtk-3-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers
RUN npx playwright install --with-deps

# Copy node_modules and build
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

ENTRYPOINT ["/usr/bin/tini", "-s", "--"]
CMD ["/run.sh"]