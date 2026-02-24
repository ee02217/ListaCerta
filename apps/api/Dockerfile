FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# Copy workspace manifests so `npm ci` can resolve workspaces without copying full sources yet
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci

COPY . .
RUN npm run prisma:generate -w @listacerta/api
RUN npm run build -w @listacerta/api

FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages/shared-types ./packages/shared-types

EXPOSE 3001
CMD ["sh", "-c", "npm run prisma:migrate:deploy -w @listacerta/api && npm run start:prod -w @listacerta/api"]
