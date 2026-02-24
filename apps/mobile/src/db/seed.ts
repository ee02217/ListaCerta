import { SQLiteDatabase } from 'expo-sqlite';

import { makeId } from '../utils/id';

export const seedDatabaseIfEmpty = async (db: SQLiteDatabase): Promise<void> => {
  const listCount = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM lists;');

  if ((listCount?.total ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const listId = makeId('list');
  const itemAId = makeId('item');
  const itemBId = makeId('item');

  const storeId = makeId('store');
  const productId = makeId('product');
  const priceId = makeId('price');

  await db.execAsync('BEGIN;');

  try {
    await db.runAsync('INSERT INTO lists (id, name, created_at) VALUES (?, ?, ?);', [
      listId,
      'My first list',
      now,
    ]);

    await db.runAsync(
      'INSERT INTO list_items (id, list_id, title, done, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [itemAId, listId, 'Milk', 0, 1, now],
    );

    await db.runAsync(
      'INSERT INTO list_items (id, list_id, title, done, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [itemBId, listId, 'Eggs', 0, 12, now],
    );

    await db.runAsync(
      'INSERT INTO stores (id, name, updated_at) VALUES (?, ?, ?);',
      [storeId, 'Local Market', now],
    );

    await db.runAsync(
      'INSERT INTO products (id, barcode, name, brand, updated_at) VALUES (?, ?, ?, ?, ?);',
      [productId, '5601234567890', 'Sample Product', 'ListaCerta', now],
    );

    await db.runAsync(
      'INSERT INTO prices (id, product_id, store_id, amount_cents, currency, observed_at) VALUES (?, ?, ?, ?, ?, ?);',
      [priceId, productId, storeId, 399, 'EUR', now],
    );

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};
