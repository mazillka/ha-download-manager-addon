FROM node:20-bookworm AS builder

WORKDIR /app

COPY app/package.json app/package-lock.json ./
RUN npm ci

COPY app/tsconfig.json ./
COPY app/backend ./backend
COPY app/frontend ./frontend
RUN npm run build

FROM node:20-bookworm

# ========= Home Assistant / Node =========
ENV NODE_ENV=production
ENV TZ=UTC

# Playwright / Chromium оптимізація
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Less logs
ENV NPM_CONFIG_LOGLEVEL=warn

# Playwright deps
RUN npx playwright install-deps chromium \
    && npx playwright install chromium

WORKDIR /app/dist

# ======= Install deps (cached layer) =======
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ======= App source =======
COPY --from=builder /app/dist/backend ./backend
COPY --from=builder /app/frontend ./frontend

# Home Assistant ingress
EXPOSE 3000

# Graceful shutdown
STOPSIGNAL SIGTERM

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
