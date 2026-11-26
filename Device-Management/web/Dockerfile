ARG NODE_BASE_IMAGE=repository.anxinyun.cn/base-images/nodejs12:20.10.12.2
ARG NODE_BUILD_IMAGE=docker.m.daocloud.io/library/node:22-bookworm-slim
FROM ${NODE_BUILD_IMAGE} AS build

WORKDIR /var/app
ARG NPM_REGISTRY=https://nexus.ngaiot.com/repository/fs-npm/
ARG WEB_BUILD_MEMORY_MB=8192
RUN node -e "if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node 22 or newer is required')"
COPY package.json package-lock.json ./
# React/Babel are devDependencies and must be present in this build stage.
RUN npm ci --include=dev --legacy-peer-deps --no-audit --no-fund --registry="$NPM_REGISTRY"
COPY . .

ARG BUILD_TIMESTAMP
ARG BUILD_NUMBER
ARG SVN_REVISION
ARG SVN_URL
RUN node -e "const fs=require('fs'); fs.writeFileSync('version.json', JSON.stringify({time:process.env.BUILD_TIMESTAMP||new Date().toISOString(),build:process.env.BUILD_NUMBER||'',revision:process.env.SVN_REVISION||'',URL:process.env.SVN_URL||''}))"
RUN NODE_OPTIONS="--max-old-space-size=$WEB_BUILD_MEMORY_MB" npm run build \
    && test -s client/index.html \
    && test -d client/build \
    && rm -rf client/src

FROM ${NODE_BASE_IMAGE} AS runtime
WORKDIR /var/app
ARG NPM_REGISTRY=https://nexus.ngaiot.com/repository/fs-npm/
ENV NODE_ENV=production
RUN node -e "if (Number(process.versions.node.split('.')[0]) < 12) throw new Error('Node 12 or newer is required')"
COPY package.json package-lock.json ./
RUN npm ci --production --no-audit --no-fund --registry="$NPM_REGISTRY" \
    && npm cache clean --force
COPY server.js config.js ./
COPY middlewares ./middlewares
COPY routes ./routes
COPY --from=build /var/app/client ./client
COPY --from=build /var/app/version.json ./version.json

EXPOSE 8080
CMD ["node", "server.js"]
