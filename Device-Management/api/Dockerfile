ARG NODE_BASE_IMAGE=repository.anxinyun.cn/base-images/nodejs12:20.10.12.2
FROM ${NODE_BASE_IMAGE}

WORKDIR /var/app
ARG NPM_REGISTRY=https://nexus.ngaiot.com/repository/fs-npm/
ENV NODE_ENV=production

RUN node -e "if (Number(process.versions.node.split('.')[0]) < 12) throw new Error('Node 12 or newer is required')"
COPY package.json package-lock.json ./
RUN npm ci --production --no-audit --no-fund --registry="$NPM_REGISTRY" \
    && npm cache clean --force
COPY . .

EXPOSE 8088
CMD ["node", "server.js"]
