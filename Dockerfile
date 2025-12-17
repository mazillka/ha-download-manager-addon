FROM mcr.microsoft.com/playwright:v1.42.0-jammy

ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

EXPOSE 3000

WORKDIR /app
COPY app/package.json .

RUN npm install --production

COPY rootfs/run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
