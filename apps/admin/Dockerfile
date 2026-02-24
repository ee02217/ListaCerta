FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci

COPY . .
RUN npm run build -w @listacerta/admin

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/admin ./apps/admin
COPY --from=builder /app/packages/shared-types ./packages/shared-types

EXPOSE 3002
CMD ["npm", "run", "start", "-w", "@listacerta/admin"]
