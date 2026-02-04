# =========================
# 1️⃣ Build stage
# =========================
FROM node:20-bookworm-slim AS builder

WORKDIR /src

# ======== Install all deps (cached layer) =======
COPY src/package.json src/package-lock.json ./
RUN npm ci

# Source code
COPY src/common ./common/
COPY src/backend ./backend/
COPY src/frontend ./frontend/

# Build backend + frontend
RUN npm run build:prod

# =========================
# 2️⃣ Runtime stage
# =========================
FROM node:20-bookworm-slim

# ========= Home Assistant / Node =========
ENV NODE_ENV=production
ENV TZ=UTC

# Less logs
ENV NPM_CONFIG_LOGLEVEL=warn

WORKDIR /src/dist

# ======= Install prod deps (cached layer) =======
COPY src/package.json src/package-lock.json ./
RUN npm ci --omit=dev \
 && npm cache clean --force

# ======= App build output =======
COPY --from=builder /src/dist/backend ./backend/
COPY --from=builder /src/dist/frontend ./frontend/

# Home Assistant ingress
EXPOSE 3000

# Graceful shutdown
STOPSIGNAL SIGTERM

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
