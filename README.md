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

## Local infrastructure (PostgreSQL)

```bash
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Adminer on `localhost:8080`

## Run apps independently

From repo root:

```bash
npm run dev:mobile
npm run dev:api
npm run dev:admin
```

Or directly with workspaces:

```bash
npm run dev -w @listacerta/mobile
npm run dev -w @listacerta/api
npm run dev -w @listacerta/admin
```

## Build all workspaces

```bash
npm run build
```

## Type check all workspaces

```bash
npm run typecheck
```

## Notes

- Shared schemas/types live in `packages/shared-types` and are imported via `@listacerta/shared-types`.
- API database config is in `apps/api/prisma/schema.prisma` and uses `DATABASE_URL`.
- Use `apps/api/.env.example` as a template for local env setup.
