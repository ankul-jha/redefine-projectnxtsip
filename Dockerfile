# The whole site as one service, for hosts like Railway or Render: the API serves the built website and sets up an
# empty database on its first start (server/scripts/setup-db.js). The Docker Compose setup (nginx in front of three
# API replicas) uses nginx/Dockerfile and server/Dockerfile instead.
FROM node:24-alpine AS client
WORKDIR /app
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production CLIENT_DIR=/app/public
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/src ./src
COPY server/scripts ./scripts
COPY server/db ./db
COPY --from=client /app/dist ./public
USER node
EXPOSE 4000
CMD ["sh", "-c", "node scripts/setup-db.js && node src/index.js"]
