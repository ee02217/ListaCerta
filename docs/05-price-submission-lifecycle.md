# Price Submission Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Captured

  Captured: Price captured on mobile/admin
  Captured --> Validation: POST /prices

  Validation --> Rejected: Invalid payload\n(product/store missing, schema fail)
  Validation --> Stored: Persisted in PostgreSQL

  Stored --> Active: status=active (default)
  Stored --> Flagged: status=flagged (manual moderation or outlier flag)

  Active --> Flagged: Moderator flags outlier
  Flagged --> Active: Moderator approves/reinstates

  Active --> [*]
  Flagged --> [*]
  Rejected --> [*]
```

## Practical behavior

1. Client submits `productId`, `storeId`, `priceCents`, `currency` (+ optional metadata).
2. API validates payload and relations.
3. API creates/links device when `submittedBy` is present.
4. Price is stored with lifecycle state (`active` or `flagged`).
5. Moderation endpoint can transition status between `active` and `flagged`.
