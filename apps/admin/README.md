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
- Temporary username/password auth via env (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)

## Run

From repo root:

```bash
cp apps/admin/.env.example apps/admin/.env.local
npm run dev -w @listacerta/admin
```

Admin UI: `http://localhost:3002`

## Required environment variables

- `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:3001`)
- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (default: `change-me-password`)
- `ADMIN_SESSION_SECRET` (used to sign cookie session)
- `ADMIN_COOKIE_SECURE` (`false` for local HTTP; set `true` behind HTTPS)

## Pages

- `/` dashboard
- `/products`
- `/products/[id]` (edit overrides + mark verified)
- `/stores`
- `/prices`
- `/devices`
- `/login`
