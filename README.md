# ListaCerta Monorepo

Full-stack monorepo for ListaCerta:

- **Mobile app**: Expo + TypeScript
- **Backend API**: NestJS + Prisma + PostgreSQL
- **Admin portal**: Next.js + TypeScript
- **Shared package**: Zod schemas + shared TypeScript types

## Structure

```txt
ListaCerta/
├── apps/
│   ├── mobile/        # Expo app
│   ├── api/           # NestJS API + Prisma
│   └── admin/         # Next.js admin portal
├── packages/
│   └── shared-types/  # Zod schemas + shared types
├── docker-compose.yml
├── .env.example
├── package.json       # npm workspaces root
├── tsconfig.base.json # shared TypeScript config
└── README.md
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose

## Install

```bash
npm install
```

## Local development setup

1) Copy environment template:

```bash
cp .env.example .env
```

2) Start core stack (Postgres + API):

```bash
docker compose up -d --build postgres api
```

3) Start admin in production mode (optional):

```bash
docker compose --profile admin up -d --build admin
```

4) Start admin in dev mode with hot reload (optional):

```bash
docker compose --profile dev up -d admin-dev
```

5) Start MinIO (optional S3-compatible storage):

```bash
docker compose --profile storage up -d minio
```

Start everything together (core + admin + minio):

```bash
docker compose --profile admin --profile storage up -d --build
```

## Service URLs

- API: `http://localhost:3001`
- Admin (prod profile): `http://localhost:3002`
- Admin (dev profile): `http://localhost:3003`
- PostgreSQL: `localhost:5432`
- MinIO API (storage profile): `http://localhost:9000`
- MinIO Console (storage profile): `http://localhost:9001`

## Stop everything

```bash
docker compose --profile admin --profile dev --profile storage down
```

## Notes

- PostgreSQL data is persisted in the `postgres_data` volume.
- API waits for DB health before starting.
- Shared schemas/types live in `packages/shared-types` and are imported via `@listacerta/shared-types`.
- API database config is in `apps/api/prisma/schema.prisma` and uses `DATABASE_URL`.
