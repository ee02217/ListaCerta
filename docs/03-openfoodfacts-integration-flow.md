# OpenFoodFacts Integration Flow (Cache-Aside)

```mermaid
sequenceDiagram
  autonumber
  participant Client as Mobile or Admin
  participant API as ProductsService
  participant PG as PostgreSQL
  participant OFS as OpenFoodFacts API

  Client->>API: GET /products/{barcode}
  API->>PG: SELECT product by barcode

  alt Found in local DB
    PG-->>API: Product row
    API-->>Client: Return local product
  else Not found locally
    PG-->>API: Empty
    API->>OFS: GET /api/v2/product/{barcode}.json

    alt OpenFoodFacts has valid product
      OFS-->>API: Raw payload
      API->>API: Normalize fields (name, brand, category, image)
      API->>PG: UPSERT product with source OFF
      PG-->>API: Stored product
      API-->>Client: Return normalized product
    else OpenFoodFacts missing or invalid
      OFS-->>API: Not found or invalid response
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
