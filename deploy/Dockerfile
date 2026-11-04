# Cách khác: chạy bằng Docker (docker compose up -d trong thư mục deploy/)
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY client ./client
COPY shared ./shared
COPY server ./server
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0 DATA_DIR=/data
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
USER node
CMD ["node", "server/server.js"]
