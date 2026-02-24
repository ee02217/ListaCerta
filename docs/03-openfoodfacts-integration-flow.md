# OpenFoodFacts Integration Flow (Cache-Aside)

```mermaid
sequenceDiagram
  autonumber
  participant Client as Mobile/Admin
  participant API as ProductsService
  participant PG as PostgreSQL
  participant OFF as OpenFoodFacts

  Client->>API: GET /products/:barcode
  API->>PG: SELECT product by barcode

  alt Found in local DB
    PG-->>API: Product row
    API-->>Client: Return local product
  else Not found locally
    PG-->>API: Empty
    API->>OFF: GET /api/v2/product/:barcode.json
    alt OFF has valid product
      OFF-->>API: Raw OFF payload
      API->>API: Normalize fields (name/brand/category/image)
      API->>PG: UPSERT product (source=OFF)
      PG-->>API: Stored product
      API-->>Client: Return normalized product
    else OFF missing/invalid
      OFF-->>API: Not found / invalid response
      API-->>Client: 404 Product not found
    end
  end
```

## Normalization rules

- Name: prefer primary product name field, reject empty values.
- Brand: first brand token when multiple are provided.
- Category: sanitize OFF tags to readable values.
- Image URL: choose available front/product image URL.
- Source: persisted as `OFF` for traceability.
