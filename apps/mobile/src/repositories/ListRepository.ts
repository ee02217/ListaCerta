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
    const item: ListItem = {
      id: makeId('item'),
      listId,
      title,
      done: false,
      quantity,
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
};
