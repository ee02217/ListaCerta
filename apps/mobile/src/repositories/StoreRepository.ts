import { getDatabase } from '../db/client';
import { ApiStore, Store } from '../domain/models';
import { makeId } from '../utils/id';

type StoreRow = {
  id: string;
  name: string;
  updated_at: string;
};

const toStore = (row: StoreRow): Store => ({
  id: row.id,
  name: row.name,
  updatedAt: row.updated_at,
});

export const storeRepository = {
  async getAll(): Promise<Store[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<StoreRow>('SELECT * FROM stores ORDER BY name ASC;');
    return rows.map(toStore);
  },

  async getByName(name: string): Promise<Store | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<StoreRow>('SELECT * FROM stores WHERE name = ? LIMIT 1;', [name]);
    return row ? toStore(row) : null;
  },

  async ensureByName(name: string): Promise<Store> {
    const normalizedName = name.trim();
    const existing = await this.getByName(normalizedName);

    if (existing) {
      return existing;
    }

    const db = await getDatabase();
    const store: Store = {
      id: makeId('store'),
      name: normalizedName,
      updatedAt: new Date().toISOString(),
    };

    await db.runAsync('INSERT INTO stores (id, name, updated_at) VALUES (?, ?, ?);', [
      store.id,
      store.name,
      store.updatedAt,
    ]);

    return store;
  },

  async upsertFromApiStore(apiStore: ApiStore): Promise<Store> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const existingById = await db.getFirstAsync<StoreRow>('SELECT * FROM stores WHERE id = ? LIMIT 1;', [
      apiStore.id,
    ]);

    if (existingById) {
      await db.runAsync('UPDATE stores SET name = ?, updated_at = ? WHERE id = ?;', [
        apiStore.name,
        now,
        apiStore.id,
      ]);

      return {
        id: apiStore.id,
        name: apiStore.name,
        updatedAt: now,
      };
    }

    await db.runAsync('INSERT INTO stores (id, name, updated_at) VALUES (?, ?, ?);', [
      apiStore.id,
      apiStore.name,
      now,
    ]);

    return {
      id: apiStore.id,
      name: apiStore.name,
      updatedAt: now,
    };
  },

  async upsertManyFromApi(stores: ApiStore[]): Promise<void> {
    for (const store of stores) {
      await this.upsertFromApiStore(store);
    }
  },
};
