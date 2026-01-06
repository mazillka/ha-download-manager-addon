FROM node:20-bookworm-slim AS builder

WORKDIR /src

COPY src/package.json src/package-lock.json ./
RUN npm ci

COPY src/backend ./backend/
COPY src/common ./common/
COPY src/frontend ./frontend/
RUN npm run build:prod

FROM node:20-bookworm-slim

# ========= Home Assistant / Node =========
ENV NODE_ENV=production
ENV TZ=UTC

# Playwright / Chromium оптимізація
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Less logs
ENV NPM_CONFIG_LOGLEVEL=warn

WORKDIR /src/dist

# ======= Install deps (cached layer) =======
COPY src/package.json src/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Playwright deps
RUN npx -y playwright install-deps chromium \
    && npx -y playwright install chromium

# ======= App source =======
COPY --from=builder /src/dist/backend ./backend/
COPY --from=builder /src/dist/frontend ./frontend/

# Home Assistant ingress
EXPOSE 3000

# Graceful shutdown
STOPSIGNAL SIGTERM

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
