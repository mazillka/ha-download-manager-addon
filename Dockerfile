FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY app/package.json app/package-lock.json ./
COPY app/webpack.config.js ./
RUN npm ci

COPY app/backend ./backend/
COPY app/frontend ./frontend/
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

WORKDIR /app/dist

# ======= Install deps (cached layer) =======
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Playwright deps
RUN npx -y playwright install-deps chromium \
    && npx -y playwright install chromium

# ======= App source =======
COPY --from=builder /app/dist/backend ./backend/
COPY --from=builder /app/dist/frontend ./frontend/

# Home Assistant ingress
EXPOSE 3000

# Graceful shutdown
STOPSIGNAL SIGTERM

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
