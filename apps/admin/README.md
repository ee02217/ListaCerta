# ListaCerta Admin Portal

Next.js App Router admin UI for catalog and moderation operations.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- API integration via `fetch`

## Features

- Dashboard home with summary cards
- Products table
  - Search by barcode/name
  - Edit product fields
  - Merge duplicates (UI placeholder)
- Stores management
- Prices moderation view
  - Flag outliers
  - Approve/reject
- Temporary token auth via env (`ADMIN_TOKEN`)

## Run

From repo root:

```bash
cp apps/admin/.env.example apps/admin/.env.local
npm run dev -w @listacerta/admin
```

Admin UI: `http://localhost:3002`

## Required environment variables

- `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:3001`)
- `ADMIN_TOKEN` (used by login + middleware auth guard)

## Pages

- `/` dashboard
- `/products`
- `/stores`
- `/prices`
- `/login`
