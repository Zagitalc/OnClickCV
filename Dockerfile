FROM node:22.12.0-bookworm-slim AS client-builder
WORKDIR /app/client
ARG VITE_API_BASE_URL=""
ARG VITE_AI_REVIEW_ENABLED="false"
ARG VITE_CV_PERSISTENCE_ENABLED="false"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AI_REVIEW_ENABLED=$VITE_AI_REVIEW_ENABLED
ENV VITE_CV_PERSISTENCE_ENABLED=$VITE_CV_PERSISTENCE_ENABLED
COPY client/package*.json ./
RUN npm ci
COPY client ./
RUN npm run build

FROM node:22.12.0-bookworm-slim AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:22.12.0-bookworm-slim
ENV NODE_ENV=production
ENV PORT=10000
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=client-builder /app/client/build ./client/build

EXPOSE 10000
CMD ["node", "server/server.js"]
