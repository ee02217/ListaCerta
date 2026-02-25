import type { PriceWithRelations } from '@listacerta/shared-types';

import { getDatabase } from '../db/client';
import { PriceWithStore } from '../domain/models';
import { makeId } from '../utils/id';

type PriceWithStoreRow = {
  id: string;
  product_id: string;
  store_id: string;
  amount_cents: number;
  currency: string;
  observed_at: string;
  status: string;
  confidence_score: number;
  store_name: string;
};

type PendingPriceSubmissionRow = {
  idempotency_key: string;
  product_id: string;
  store_id: string;
  price_cents: number;
  currency: string;
  captured_at: string;
  photo_url: string | null;
  created_at: string;
  retry_count: number;
  last_error: string | null;
};

export type PendingPriceSubmission = {
  idempotencyKey: string;
  productId: string;
  storeId: string;
  priceCents: number;
  currency: string;
  capturedAt: string;
  photoUrl: string | null;
  createdAt: string;
  retryCount: number;
  lastError: string | null;
};

const toPriceWithStore = (row: PriceWithStoreRow): PriceWithStore => ({
  id: row.id,
  productId: row.product_id,
  storeId: row.store_id,
  amountCents: row.amount_cents,
  currency: row.currency,
  observedAt: row.observed_at,
  storeName: row.store_name,
});

const toPendingSubmission = (row: PendingPriceSubmissionRow): PendingPriceSubmission => ({
  idempotencyKey: row.idempotency_key,
  productId: row.product_id,
  storeId: row.store_id,
  priceCents: row.price_cents,
  currency: row.currency,
  capturedAt: row.captured_at,
  photoUrl: row.photo_url,
  createdAt: row.created_at,
  retryCount: row.retry_count,
  lastError: row.last_error,
});

export const priceRepository = {
  async listByProductId(productId: string): Promise<PriceWithStore[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PriceWithStoreRow>(
      `SELECT p.id,
              p.product_id,
              p.store_id,
              p.amount_cents,
              p.currency,
              p.observed_at,
              p.status,
              p.confidence_score,
              s.name as store_name
         FROM prices p
         JOIN stores s ON s.id = p.store_id
        WHERE p.product_id = ?
          AND p.status = 'active'
          AND p.observed_at = (
            SELECT MAX(p2.observed_at)
              FROM prices p2
             WHERE p2.product_id = p.product_id
               AND p2.store_id = p.store_id
               AND p2.status = 'active'
          )
        ORDER BY p.observed_at DESC;`,
      [productId],
    );

    return rows.map(toPriceWithStore);
  },

  async upsertFromApiPrice(price: PriceWithRelations): Promise<void> {
    const db = await getDatabase();
    const storeName = price.store?.name ?? 'Unknown store';

    const storeExists = await db.getFirstAsync<{ id: string }>('SELECT id FROM stores WHERE id = ? LIMIT 1;', [
      price.storeId,
    ]);

    if (!storeExists) {
      await db.runAsync('INSERT INTO stores (id, name, updated_at) VALUES (?, ?, ?);', [
        price.storeId,
        storeName,
        new Date().toISOString(),
      ]);
    }

    const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM prices WHERE id = ? LIMIT 1;', [
      price.id,
    ]);

    if (existing) {
      await db.runAsync(
        `UPDATE prices
            SET product_id = ?,
                store_id = ?,
                amount_cents = ?,
                currency = ?,
                observed_at = ?,
                status = ?,
                confidence_score = ?
          WHERE id = ?;`,
        [
          price.productId,
          price.storeId,
          price.priceCents,
          price.currency,
          price.capturedAt,
          price.status,
          price.confidenceScore,
          price.id,
        ],
      );

      return;
    }

    await db.runAsync(
      `INSERT INTO prices (id, product_id, store_id, amount_cents, currency, observed_at, status, confidence_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        price.id,
        price.productId,
        price.storeId,
        price.priceCents,
        price.currency,
        price.capturedAt,
        price.status,
        price.confidenceScore,
      ],
    );
  },

  async queuePendingSubmission(input: {
    idempotencyKey: string;
    productId: string;
    storeId: string;
    priceCents: number;
    currency: string;
    capturedAt: string;
    photoUrl?: string | null;
  }): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      `INSERT OR REPLACE INTO pending_price_submissions (
          idempotency_key,
          product_id,
          store_id,
          price_cents,
          currency,
          captured_at,
          photo_url,
          created_at,
          retry_count,
          last_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT retry_count FROM pending_price_submissions WHERE idempotency_key = ?), 0), COALESCE((SELECT last_error FROM pending_price_submissions WHERE idempotency_key = ?), NULL));`,
      [
        input.idempotencyKey,
        input.productId,
        input.storeId,
        input.priceCents,
        input.currency,
        input.capturedAt,
        input.photoUrl ?? null,
        new Date().toISOString(),
        input.idempotencyKey,
        input.idempotencyKey,
      ],
    );
  },

  async listPendingSubmissions(limit = 100): Promise<PendingPriceSubmission[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PendingPriceSubmissionRow>(
      `SELECT *
         FROM pending_price_submissions
        ORDER BY created_at ASC
        LIMIT ?;`,
      [limit],
    );

    return rows.map(toPendingSubmission);
  },

  async removePendingSubmission(idempotencyKey: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM pending_price_submissions WHERE idempotency_key = ?;', [idempotencyKey]);
  },

  async markPendingSubmissionFailed(idempotencyKey: string, errorMessage: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE pending_price_submissions
          SET retry_count = retry_count + 1,
              last_error = ?
        WHERE idempotency_key = ?;`,
      [errorMessage.slice(0, 500), idempotencyKey],
    );
  },

  async addPrice(input: {
    productId: string;
    storeId: string;
    amountCents: number;
    currency: string;
    observedAt?: string;
  }): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      `INSERT INTO prices (id, product_id, store_id, amount_cents, currency, observed_at, status, confidence_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        makeId('price'),
        input.productId,
        input.storeId,
        input.amountCents,
        input.currency,
        input.observedAt ?? new Date().toISOString(),
        'active',
        1,
      ],
    );
  },
};
