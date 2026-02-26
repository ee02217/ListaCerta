# Smart Add Product (Shopping List)

## Overview

Smart Add Product lets users add products into a shopping list directly from the list detail screen, with server-backed search, local cache upserts, offline fallback, and inline manual product creation.

## UX flow

- In list detail, a top input (`Add product…`) drives autocomplete.
- Search runs with 300ms debounce and cancels previous requests.
- Dropdown shows product rows (name, brand, image, best known price).
- If no suitable result, user can tap **Create new product**.
- New product modal captures name/brand/category and submits to backend with `barcode = null`.
- On success, product is cached locally and added to the current list.

## Mermaid sequence

```mermaid
sequenceDiagram
  participant U as User
  participant M as Mobile (ListDetailScreen)
  participant API as Backend API
  participant DB as Local SQLite

  U->>M: Type "leite" in Add product…
  M->>M: Debounce 300ms + cancel in-flight request
  M->>API: GET /products/search?q=leite

  alt Online success
    API-->>M: Product[]
    M->>DB: upsert products cache
  else Offline / network error
    M->>DB: searchLocal(query)
    DB-->>M: cached Product[]
    M->>U: show "Offline mode"
  end

  M->>DB: getBestKnownPriceByProductIds(ids)
  DB-->>M: best known local prices
  M-->>U: render dropdown results

  alt User selects product
    U->>M: Tap product row
    M->>DB: addItem(listId, product.name, 1)
    M-->>U: clear input + close dropdown
  else User taps Create new product
    U->>M: Open create modal
    U->>M: Fill name/brand/category
    M->>API: POST /products (barcode=null, source=manual)
    API-->>M: created Product
    M->>DB: upsert product cache
    M->>DB: addItem(listId, product.name, 1)
    M-->>U: close modal + updated list
  end
```

## API contract

### 1) Search products

`GET /products/search?q=<query>&limit=<n>`

- Case-insensitive partial match (name/brand)
- Backed by indexed query path in Prisma (`@@index([name, brand])`)
- Returns shared `Product[]` schema

### 2) Manual product creation

`POST /products`

Request body supports:

- `name` (required)
- `brand` (nullable)
- `category` (nullable)
- `barcode` (nullable)
- `source` (`manual`)

Server behavior:

- Allows `barcode = null`
- Persists manual product
- Returns created `Product`

## SQLite caching logic

### Product cache upsert

`ProductRepository.upsertFromApiProduct()` now stores:

- `id`
- `barcode` (nullable)
- `name`
- `brand`
- `category`
- `imageUrl`
- `updatedAt`

### Local fallback search

`ProductRepository.searchLocal(query, limit)` performs case-insensitive local matching on:

- `name`
- `brand`

### Best known price enrichment

`PriceRepository.getBestKnownPriceByProductIds(ids)` returns lowest active local price per product for dropdown display.

## Offline fallback strategy

- Remote search errors (`ApiNetworkError`, `ApiTimeoutError`) trigger local search fallback.
- UI shows **Offline mode** banner.
- Product creation remains server-backed; if offline, modal shows actionable error.

## Duplicate prevention

- List add path uses repository de-dup behavior: adding the same item title in the same list increments quantity instead of creating duplicate rows.

## Evidence (runtime)

- A) Typing query: `docs/screenshots/product-search-01.png`
- B) Search dropdown results: `docs/screenshots/product-search-02.png`
- C) Create product modal: `docs/screenshots/product-search-03.png`
- D) Product added to list: `docs/screenshots/product-search-04.png`
- E) Backend creation proof (Swagger): `docs/screenshots/product-search-06.jpg`
- F) Local DB cached product (Prisma Studio): `docs/screenshots/product-search-07.png`
