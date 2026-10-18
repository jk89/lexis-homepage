# Build context is the directory holding both repos:
#
#   <context>/yaw/yaw          the yaw monorepo
#   <context>/lexis-homepage   this site, which depends on it via file: paths
#
# Dockerfile.dockerignore keeps the context to just those two.

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

WORKDIR /repo/yaw/yaw
COPY yaw/yaw/package.json yaw/yaw/package-lock.json ./
COPY yaw/yaw/packages/yaw-common/package.json packages/yaw-common/
COPY yaw/yaw/packages/yaw/package.json packages/yaw/
COPY yaw/yaw/packages/yaw-transformer/package.json packages/yaw-transformer/
COPY yaw/yaw/packages/yaw-ts-plugin/package.json packages/yaw-ts-plugin/
COPY yaw/yaw/packages/yaw-vite/package.json packages/yaw-vite/
COPY yaw/yaw/packages/yaw-ssg/package.json packages/yaw-ssg/
RUN npm ci && npm install @rollup/rollup-linux-x64-musl --no-save

COPY yaw/yaw/tsconfig.base.json yaw/yaw/tsconfig.json ./

COPY yaw/yaw/packages/yaw-common packages/yaw-common
RUN npm run build -w packages/yaw-common

COPY yaw/yaw/packages/yaw-transformer packages/yaw-transformer
RUN npm run build -w packages/yaw-transformer

COPY yaw/yaw/packages/yaw packages/yaw
RUN npm run build -w packages/yaw

COPY yaw/yaw/packages/yaw-vite packages/yaw-vite
RUN npm run build -w packages/yaw-vite

COPY yaw/yaw/packages/yaw-ssg packages/yaw-ssg
RUN npm run build -w packages/yaw-ssg

COPY yaw/yaw/packages/yaw-ts-plugin packages/yaw-ts-plugin

WORKDIR /repo/lexis-homepage
COPY lexis-homepage/package.json lexis-homepage/package-lock.json ./
RUN npm ci && npm install @rollup/rollup-linux-x64-musl --no-save
COPY lexis-homepage ./
RUN npm run build

# SSG capture with the system chromium from ssg-base
FROM ssg-base AS ssg

WORKDIR /repo
COPY --from=build /repo /repo

WORKDIR /repo/lexis-homepage
RUN npm run build:ssg

FROM nginx:alpine
COPY --from=ssg /repo/lexis-homepage/public /usr/share/nginx/html
ARG NGINX_CONF=nginx.conf
COPY lexis-homepage/${NGINX_CONF} /etc/nginx/conf.d/default.conf
EXPOSE 80
