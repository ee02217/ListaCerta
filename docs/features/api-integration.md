# API Integration (Public Nginx Endpoint)

## Base URL strategy

The mobile app now resolves its API base URL from a single source of truth:

- `apps/mobile/src/api/client.ts`

Default value:

```txt
https://products.sasnas.duckdns.org:1443
```

Environment override (Expo public env):

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

## How to override locally

Create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=https://products.sasnas.duckdns.org:1443
# optional local override
# EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Then restart Metro/dev client.

## API client implementation

- `apps/mobile/src/api/client.ts`
  - base URL resolution
  - 10s request timeout
  - JSON parsing
  - typed errors (`ApiHttpError`, `ApiTimeoutError`, `ApiNetworkError`, `ApiParseError`)
  - `x-request-id` header generation for tracing

- `apps/mobile/src/api/endpoints.ts`
  - `getProductByBarcode(barcode)`
  - `listStores()`
  - `createStore(payload)`
  - `submitPrice(payload)`
  - `getBestPrice(productId)`
  - `getHealth()`

## Example curl

```bash
curl -sS 'https://products.sasnas.duckdns.org:1443/health' | python3 -m json.tool
```

## Runtime proof

Example Metro logs (from device runtime):

```txt
[api] GET https://products.sasnas.duckdns.org:1443/stores [...request-id...]
[api] GET https://products.sasnas.duckdns.org:1443/health [...request-id...]
[api] GET https://products.sasnas.duckdns.org:1443/products/search?q=leite&limit=50 [...request-id...]
```

## Screenshots (real runtime)

- Mobile product loaded after backend lookup:
  - `docs/screenshots/api-integration-mobile-product-loaded.png`
