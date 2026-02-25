# API Route Coverage

## Health
- `GET /health`

## Products
- `GET /products`
- `GET /products/search`
- `GET /products/id/:id`
- `GET /products/barcode/:barcode`
- `GET /products/:barcode` (legacy)
- `POST /products`
- `PATCH /products/:id`
- `PUT /products/:id`

## Stores
- `GET /stores`
- `POST /stores`

## Prices
- `POST /prices`
- `GET /prices/moderation`
- `PATCH /prices/:id/moderation`
- `GET /prices/best/:productId`
- `GET /prices/history/:productId`

## Devices
- `GET /devices`

## Analytics
- `GET /analytics/summary`

All routes above are covered in `/docs/features/*.md`.
