# UI System Refactor — ListaCerta Mobile

This document captures the structured UI/UX refactor that introduced a consistent navigation architecture, design system, and reusable component library for the Expo app.

## 1) Navigation Architecture

Implemented bottom tabs with independent stacks using Expo Router + React Navigation tab primitives.

```text
Root
└── BottomTabs
    ├── ListsStack
    │   ├── Lists
    │   └── List Detail
    ├── SearchStack
    │   ├── Search
    │   ├── Scan Barcode
    │   ├── Product Detail
    │   └── Add Price
    └── SettingsStack
        └── Settings
```

### Route files

- `apps/mobile/app/_layout.tsx` (root stack + startup orchestration)
- `apps/mobile/app/(tabs)/_layout.tsx` (bottom tabs)
- `apps/mobile/app/(tabs)/(lists)/_layout.tsx`
- `apps/mobile/app/(tabs)/(search)/_layout.tsx`
- `apps/mobile/app/(tabs)/(settings)/_layout.tsx`

Legacy deep-link compatibility is preserved through redirect wrappers in the old paths:

- `app/index.tsx`
- `app/scan.tsx`
- `app/products/search.tsx`
- `app/lists/[id].tsx`
- `app/products/[id].tsx`
- `app/prices/add.tsx`

## 2) Theme (Single source of truth)

Theme tokens are centralized in:

- `apps/mobile/src/theme/index.ts`

Includes:

- **Colors**: `primary`, `background`, `surface`, `text`, `muted`, `border`, `error`, `success`, plus semantic helpers (`modalOverlay`, `scanBackground`, etc.)
- **Spacing scale**: `4, 8, 12, 16, 24, 32`
- **Border radius scale**: `sm, md, lg, xl, pill`
- **Typography scale**: `title, heading, sectionLabel, body, bodyMuted, caption, button`
- **Elevation/shadows**: `card`, `floating`

### Styling rules applied

- No random hardcoded color values outside theme tokens
- No mixed visual language; all key screens use shared spacing/radius/typography
- Press interactions use `Pressable` with consistent visual feedback

## 3) Reusable Components Library

Created in `apps/mobile/src/components/`:

- `ScreenContainer`
- `SectionHeader`
- `Card`
- `PrimaryButton`
- `SecondaryButton`
- `ListItemRow`
- `EmptyState`
- `LoadingState`
- `index.ts` barrel export

## 4) Refactored Screens (production-oriented)

New screen modules under `apps/mobile/src/screens/`:

- `ListsScreen.tsx`
  - card list
  - floating New List button
  - empty state
- `ListDetailScreen.tsx`
  - improved hierarchy and controls
  - quantity interactions with feedback
- `SearchScreen.tsx`
  - prominent search bar
  - recent searches
  - product cards with image/brand/best price
  - loading/error/empty states
- `SettingsScreen.tsx`
  - preferred store selector chips
  - toggles
  - device+storage info
  - app version + network status
- `ScanBarcodeScreen.tsx`
  - loading/error states
  - retry
  - API health badge
- `ProductDetailScreen.tsx`
  - normalized cards and modal treatment
- `AddPriceScreen.tsx`
  - normalized form and modal interactions

## 5) Design decisions (brief)

1. **iOS-native feel**
   - soft card shadows and rounded corners
   - tab bar spacing/height tuned for legibility
2. **Hierarchy-first layouts**
   - section headers + card groupings
   - primary actions clearly separated from secondary actions
3. **State clarity**
   - explicit loading, empty, and error components
4. **Scalable consistency**
   - all screens built from shared components and theme tokens
5. **Compatibility retained**
   - legacy routes redirect to new tab architecture so existing deep links keep working

## 6) Before / After Screenshots (real runtime captures)

### Before

- Lists detail (old style):
  - `docs/screenshots/feature02-list-mobile.png`
- Search (old style):
  - `docs/screenshots/feature07-search-mobile.png`

### After

- Lists tab:
  - `docs/screenshots/ui-after-lists.png`
- Search tab:
  - `docs/screenshots/ui-after-search.png`
- Search with results:
  - `docs/screenshots/ui-after-search-results.png`
- Settings tab:
  - `docs/screenshots/ui-after-settings.png`

All screenshots above were captured from the iOS Simulator runtime.
