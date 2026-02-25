import { SQLiteDatabase } from 'expo-sqlite';

type Migration = {
  version: number;
  statements: string[];
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      'PRAGMA foreign_keys = ON;',
      `CREATE TABLE IF NOT EXISTS lists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS list_items (
        id TEXT PRIMARY KEY NOT NULL,
        list_id TEXT NOT NULL,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        barcode TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        brand TEXT,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS prices (
        id TEXT PRIMARY KEY NOT NULL,
        product_id TEXT NOT NULL,
        store_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      );`,
      'CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id);',
      'CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);',
      'CREATE INDEX IF NOT EXISTS idx_prices_store_id ON prices(store_id);',
    ],
  },
  {
    version: 2,
    statements: [
      "ALTER TABLE prices ADD COLUMN status TEXT NOT NULL DEFAULT 'active';",
      "ALTER TABLE prices ADD COLUMN confidence_score REAL NOT NULL DEFAULT 1;",
      'CREATE INDEX IF NOT EXISTS idx_prices_status ON prices(status);',
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS pending_price_submissions (
        idempotency_key TEXT PRIMARY KEY NOT NULL,
        product_id TEXT NOT NULL,
        store_id TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        photo_url TEXT,
        created_at TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );`,
      'CREATE INDEX IF NOT EXISTS idx_pending_price_created_at ON pending_price_submissions(created_at);',
    ],
  },
];

export const runMigrations = async (db: SQLiteDatabase): Promise<void> => {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await db.execAsync('BEGIN;');

    try {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }

      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }
};
