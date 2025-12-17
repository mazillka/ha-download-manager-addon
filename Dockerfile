FROM mcr.microsoft.com/playwright:v1.57.0-jammy

# ========= Home Assistant / Node =========
ENV NODE_ENV=production
ENV TZ=UTC

# Playwright / Chromium оптимізація
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Less logs
ENV NPM_CONFIG_LOGLEVEL=warn

WORKDIR /app

# ======= Install deps (cached layer) =======
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ======= App source =======
COPY app/ .

# Home Assistant ingress
EXPOSE 3000

# Graceful shutdown
STOPSIGNAL SIGTERM

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
