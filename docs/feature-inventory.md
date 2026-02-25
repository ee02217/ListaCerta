# Feature Inventory

| Feature Name | Layer (Mobile/API/Admin) | Status | Endpoints | DB Tables | Screens Required |
|---|---|---|---|---|---|
| 01 Barcode Product Lookup | Mobile + API | Implemented | `GET /products/barcode/:barcode` | Product, products(SQLite) | `/scan`, `/products/[id]` |
| 02 Add Product to Shopping List | Mobile | Implemented | — | lists, list_items | `/products/[id]`, `/lists/[id]` |
| 03 Submit Product Price | Mobile + API + Admin | Implemented | `POST /prices` | Price, Store, Product, prices(SQLite) | `/products/[id]`, `/prices/add`, `/prices` (admin) |
| 04 Best Price Aggregation | Mobile + API | Implemented | `GET /prices/best/:productId` | Price, Store | `/products/[id]` |
| 05 Store CRUD | API + Mobile + Admin | Implemented | `GET /stores`, `POST /stores` | Store, stores(SQLite) | `/prices/add`, `/stores` (admin) |
| 06 Price Moderation | API + Admin + Mobile filtering | Implemented | `GET /prices/moderation`, `PATCH /prices/:id/moderation` | Price | `/prices` (admin), `/products/[id]` |
| 07 Product Search | API + Mobile | Implemented | `GET /products/search?q=` | Product | `/products/search` |
| 08 Price History | API + Mobile | Implemented | `GET /prices/history/:productId` | Price, Store | `/products/[id]` |
| 09 Offline Sync | Mobile + API | Implemented | `POST /prices` (idempotent) | pending_price_submissions(SQLite), Price.idempotencyKey | `/prices/add`, app startup `_layout` |
| 10 Anonymous Device Identity | Mobile + API | Implemented | `POST /prices` (`submittedBy`) | Device, Price.submittedBy, app_identity(SQLite) | app startup `_layout`, `/prices/add` |
| 11 Product Editing in Admin | Admin + API | Implemented | `GET /products/id/:id`, `PUT /products/:id` | Product.isVerified + overrides | `/products` admin, `/products/[id]` admin |
| 12 Basic Analytics | API + Admin | Implemented | `GET /analytics/summary` | Product, Price, Store | `/` admin dashboard |
| Devices Monitoring Tab | API + Admin | Implemented | `GET /devices` | Device, Price | `/devices` admin |
| Core Auth (admin credentials + cookie) | Admin | Implemented | `/login` flow | browser cookie | `/login`, protected admin routes |
