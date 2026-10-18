# Build context is this directory; the yaw packages come from npm.

FROM node:24-slim AS ssg-base

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libxshmfence1 \
    chromium \
 && rm -rf /var/lib/apt/lists/*

# yaw-ssg finds a browser on PATH; this wrapper lets Debian's chromium run as
# root inside the build. (Unpinned @sparticuz/chromium no longer exports the
# headless mode yaw-ssg passes to puppeteer, so it crashes on launch.)
RUN printf '#!/bin/sh\nexec /usr/bin/chromium --no-sandbox --disable-dev-shm-usage "$@"\n' > /usr/local/bin/chromium \
 && chmod +x /usr/local/bin/chromium

FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm install @rollup/rollup-linux-x64-musl --no-save
COPY . ./
RUN npm run build

# SSG capture with the system chromium from ssg-base
FROM ssg-base AS ssg

WORKDIR /app
COPY --from=build /app /app
RUN npm run build:ssg

FROM nginx:alpine
COPY --from=ssg /app/public /usr/share/nginx/html
ARG NGINX_CONF=nginx.conf
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf
EXPOSE 80
