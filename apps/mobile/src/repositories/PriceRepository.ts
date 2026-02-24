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
  store_name: string;
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
              s.name as store_name
         FROM prices p
         JOIN stores s ON s.id = p.store_id
        WHERE p.product_id = ?
          AND p.observed_at = (
            SELECT MAX(p2.observed_at)
              FROM prices p2
             WHERE p2.product_id = p.product_id
               AND p2.store_id = p.store_id
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
                observed_at = ?
          WHERE id = ?;`,
        [price.productId, price.storeId, price.priceCents, price.currency, price.capturedAt, price.id],
      );

      return;
    }

    await db.runAsync(
      `INSERT INTO prices (id, product_id, store_id, amount_cents, currency, observed_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [price.id, price.productId, price.storeId, price.priceCents, price.currency, price.capturedAt],
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
      `INSERT INTO prices (id, product_id, store_id, amount_cents, currency, observed_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        makeId('price'),
        input.productId,
        input.storeId,
        input.amountCents,
        input.currency,
        input.observedAt ?? new Date().toISOString(),
      ],
    );
  },
};
