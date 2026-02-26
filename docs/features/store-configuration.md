# Store Configuration (Local MVP)

## Goal

Allow users to manage local store visibility from **Settings → Stores** and ensure only enabled stores appear in the **Add Price** store picker.

This is local-device configuration (SQLite only), no backend sync required.

---

## Data model & migration

### `stores` table (SQLite)

Added/ensured fields:

- `id` (TEXT, PK)
- `name` (TEXT)
- `enabled` (INTEGER boolean, default `1`)
- `created_at` (TEXT)
- `updated_at` (TEXT)

### Migration behavior

Migration adds:

- `enabled` column (`NOT NULL DEFAULT 1`)
- `created_at` column
- `idx_stores_enabled` index
- case-insensitive unique name index (`name COLLATE NOCASE`)

Migration is safe on app restart and keeps existing stores; existing rows are backfilled.

---

## Repository layer

All SQL is in `StoreRepository` (no inline SQL in screens).

Implemented functions:

- `listStores({ enabledOnly?: boolean })`
- `createStore(name)`
- `setStoreEnabled(storeId, enabled)`

Validation in repository:

- trimmed non-empty name
- case-insensitive uniqueness check

---

## Settings UX

### Settings → Stores section

- Lists all local stores
- Shows enable/disable switch per store
- “Add Store” button opens modal

### Add Store modal

- Input for store name
- Validation:
  - required
  - trimmed
  - unique (case-insensitive)
- On save, store is created with `enabled = true`

---

## Add Price integration

Store picker now loads from local SQLite using:

- `storeRepository.listStores({ enabledOnly: true })`

Behavior:

- Disabled stores are hidden from picker
- Prices tied to disabled stores remain intact in DB
- If no enabled stores:
  - show empty state: **“No stores enabled. Enable stores in Settings.”**
  - button to open Settings tab

Refresh behavior:

- Store list refreshes on focus and before opening picker
- Handles cases where a store is disabled while Add Price is open

---

## Edge cases handled

- Disabling store does not delete existing prices
- Add Price gracefully handles zero enabled stores
- DB errors surface user-friendly alerts/messages

---

## Runtime evidence (simulator)

- Settings store list with toggles:
  - `docs/screenshots/stores-settings-01.png`
- Add Store modal:
  - `docs/screenshots/stores-settings-02.png`
- Add Price picker showing enabled stores only:
  - `docs/screenshots/stores-settings-03.png`
- Add Price empty state with all stores disabled:
  - `docs/screenshots/stores-settings-04.png`

Tested in iOS Simulator.
