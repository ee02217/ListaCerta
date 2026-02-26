import { getDatabase } from '../db/client';
import { ApiStore, Store } from '../domain/models';
import { makeId } from '../utils/id';

type StoreRow = {
  id: string;
  name: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

const toStore = (row: StoreRow): Store => ({
  id: row.id,
  name: row.name,
  enabled: row.enabled === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeName = (name: string) => name.trim();

export const storeRepository = {
  async listStores(options?: { enabledOnly?: boolean }): Promise<Store[]> {
    const db = await getDatabase();

    const rows = options?.enabledOnly
      ? await db.getAllAsync<StoreRow>(
          'SELECT * FROM stores WHERE enabled = 1 ORDER BY name COLLATE NOCASE ASC;',
        )
      : await db.getAllAsync<StoreRow>('SELECT * FROM stores ORDER BY name COLLATE NOCASE ASC;');

    return rows.map(toStore);
  },

  async getAll(): Promise<Store[]> {
    return this.listStores();
  },

  async getById(id: string): Promise<Store | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<StoreRow>('SELECT * FROM stores WHERE id = ? LIMIT 1;', [id]);
    return row ? toStore(row) : null;
  },

  async getByName(name: string): Promise<Store | null> {
    const normalized = normalizeName(name);
    if (!normalized) {
      return null;
    }

    const db = await getDatabase();
    const row = await db.getFirstAsync<StoreRow>(
      'SELECT * FROM stores WHERE lower(name) = lower(?) LIMIT 1;',
      [normalized],
    );

    return row ? toStore(row) : null;
  },

  async createStore(name: string): Promise<Store> {
    const normalized = normalizeName(name);

    if (!normalized) {
      throw new Error('Store name cannot be empty.');
    }

    const existing = await this.getByName(normalized);
    if (existing) {
      throw new Error('A store with this name already exists.');
    }

    const db = await getDatabase();
    const now = new Date().toISOString();

    const store: Store = {
      id: makeId('store'),
      name: normalized,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.runAsync(
      'INSERT INTO stores (id, name, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
      [store.id, store.name, 1, store.createdAt, store.updatedAt],
    );

    return store;
  },

  async ensureByName(name: string): Promise<Store> {
    const existing = await this.getByName(name);
    if (existing) {
      return existing;
    }

    return this.createStore(name);
  },

  async setStoreEnabled(storeId: string, enabled: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE stores SET enabled = ?, updated_at = ? WHERE id = ?;', [
      enabled ? 1 : 0,
      new Date().toISOString(),
      storeId,
    ]);
  },

  async upsertFromApiStore(apiStore: ApiStore): Promise<Store> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const existing = await this.getById(apiStore.id);

    if (existing) {
      await db.runAsync('UPDATE stores SET name = ?, updated_at = ? WHERE id = ?;', [
        apiStore.name,
        now,
        apiStore.id,
      ]);

      return {
        ...existing,
        name: apiStore.name,
        updatedAt: now,
      };
    }

    await db.runAsync(
      'INSERT INTO stores (id, name, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
      [apiStore.id, apiStore.name, 1, now, now],
    );

    return {
      id: apiStore.id,
      name: apiStore.name,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
  },

  async upsertManyFromApi(stores: ApiStore[]): Promise<void> {
    for (const store of stores) {
      await this.upsertFromApiStore(store);
    }
  },
};
