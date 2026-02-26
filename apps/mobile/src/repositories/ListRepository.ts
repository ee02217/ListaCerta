import { getDatabase } from '../db/client';
import { List, ListItem } from '../domain/models';
import { makeId } from '../utils/id';

type ListRow = {
  id: string;
  name: string;
  created_at: string;
};

type ListItemRow = {
  id: string;
  list_id: string;
  title: string;
  done: number;
  quantity: number;
  created_at: string;
};

const toList = (row: ListRow): List => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
});

const toListItem = (row: ListItemRow): ListItem => ({
  id: row.id,
  listId: row.list_id,
  title: row.title,
  done: Boolean(row.done),
  quantity: row.quantity,
  createdAt: row.created_at,
});

export const listRepository = {
  async getAllLists(): Promise<List[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ListRow>('SELECT * FROM lists ORDER BY created_at DESC;');
    return rows.map(toList);
  },

  async getListById(id: string): Promise<List | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ListRow>('SELECT * FROM lists WHERE id = ? LIMIT 1;', [id]);
    return row ? toList(row) : null;
  },

  async createList(name: string): Promise<List> {
    const db = await getDatabase();
    const list: List = {
      id: makeId('list'),
      name,
      createdAt: new Date().toISOString(),
    };

    await db.runAsync('INSERT INTO lists (id, name, created_at) VALUES (?, ?, ?);', [
      list.id,
      list.name,
      list.createdAt,
    ]);

    return list;
  },

  async getItemsForList(listId: string): Promise<ListItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ListItemRow>(
      'SELECT * FROM list_items WHERE list_id = ? ORDER BY created_at ASC;',
      [listId],
    );

    return rows.map(toListItem);
  },

  async addItem(listId: string, title: string, quantity = 1): Promise<ListItem> {
    const db = await getDatabase();
    const normalizedTitle = title.trim();
    const safeQuantity = Math.max(1, Math.floor(quantity));

    if (!normalizedTitle) {
      throw new Error('Item title cannot be empty.');
    }

    const existing = await db.getFirstAsync<ListItemRow>(
      'SELECT * FROM list_items WHERE list_id = ? AND lower(title) = lower(?) LIMIT 1;',
      [listId, normalizedTitle],
    );

    if (existing) {
      const nextQuantity = Math.max(1, Math.floor((existing.quantity ?? 0) + safeQuantity));
      await db.runAsync('UPDATE list_items SET quantity = ?, done = 0 WHERE id = ?;', [
        nextQuantity,
        existing.id,
      ]);

      return {
        id: existing.id,
        listId: existing.list_id,
        title: existing.title,
        done: false,
        quantity: nextQuantity,
        createdAt: existing.created_at,
      };
    }

    const item: ListItem = {
      id: makeId('item'),
      listId,
      title: normalizedTitle,
      done: false,
      quantity: safeQuantity,
      createdAt: new Date().toISOString(),
    };

    await db.runAsync(
      'INSERT INTO list_items (id, list_id, title, done, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [item.id, item.listId, item.title, 0, item.quantity, item.createdAt],
    );

    return item;
  },

  async toggleItemDone(itemId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE list_items
       SET done = CASE WHEN done = 1 THEN 0 ELSE 1 END
       WHERE id = ?;`,
      [itemId],
    );
  },

  async updateItemQuantity(itemId: string, quantity: number): Promise<void> {
    const db = await getDatabase();
    const safeQuantity = Math.max(1, Math.floor(quantity));

    await db.runAsync('UPDATE list_items SET quantity = ? WHERE id = ?;', [safeQuantity, itemId]);
  },

  async deleteItem(itemId: string): Promise<void> {
    const db = await getDatabase();
    await db.execAsync('BEGIN;');

    try {
      await db.runAsync('DELETE FROM list_items WHERE id = ?;', [itemId]);
      await db.execAsync('COMMIT;');
      console.info(`[db] DELETE FROM list_items WHERE id = ?; [${itemId}]`);
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  },

  async restoreItem(item: ListItem): Promise<void> {
    const db = await getDatabase();
    await db.execAsync('BEGIN;');

    try {
      await db.runAsync(
        'INSERT INTO list_items (id, list_id, title, done, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?);',
        [item.id, item.listId, item.title, item.done ? 1 : 0, item.quantity, item.createdAt],
      );
      await db.execAsync('COMMIT;');
      console.info(`[db] INSERT INTO list_items (...) VALUES (...); [${item.id}]`);
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  },

  async updateListName(listId: string, name: string): Promise<void> {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error('List name cannot be empty.');
    }

    const db = await getDatabase();
    await db.runAsync('UPDATE lists SET name = ? WHERE id = ?;', [normalizedName, listId]);
    console.info(`[db] UPDATE lists SET name = ? WHERE id = ?; [${listId}]`);
  },

  async deleteList(listId: string): Promise<void> {
    const db = await getDatabase();

    await db.execAsync('BEGIN;');

    try {
      // Keep explicit child delete for robustness in case FK pragma is off.
      await db.runAsync('DELETE FROM list_items WHERE list_id = ?;', [listId]);
      await db.runAsync('DELETE FROM lists WHERE id = ?;', [listId]);
      await db.execAsync('COMMIT;');
      console.info(`[db] DELETE FROM list_items WHERE list_id = ?; [${listId}]`);
      console.info(`[db] DELETE FROM lists WHERE id = ?; [${listId}]`);
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  },
};
