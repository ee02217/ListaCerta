import { getDatabase } from '../db/client';
import { ApiProduct, Product } from '../domain/models';
import { makeId } from '../utils/id';

type ProductRow = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  updated_at: string;
};

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  barcode: row.barcode,
  name: row.name,
  brand: row.brand,
  updatedAt: row.updated_at,
});

export const productRepository = {
  async getById(id: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE id = ? LIMIT 1;', [id]);
    return row ? toProduct(row) : null;
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ProductRow>(
      'SELECT * FROM products WHERE barcode = ? LIMIT 1;',
      [barcode],
    );
    return row ? toProduct(row) : null;
  },

  async upsertFromApiProduct(apiProduct: ApiProduct): Promise<Product> {
    const db = await getDatabase();
    const existing = await this.getByBarcode(apiProduct.barcode);

    if (existing) {
      await db.runAsync(
        'UPDATE products SET name = ?, brand = ?, updated_at = ? WHERE id = ?;',
        [apiProduct.name, apiProduct.brand ?? null, apiProduct.updatedAt, existing.id],
      );

      return {
        ...existing,
        name: apiProduct.name,
        brand: apiProduct.brand,
        updatedAt: apiProduct.updatedAt,
      };
    }

    const product: Product = {
      id: apiProduct.id,
      barcode: apiProduct.barcode,
      name: apiProduct.name,
      brand: apiProduct.brand,
      updatedAt: apiProduct.updatedAt,
    };

    await db.runAsync(
      'INSERT INTO products (id, barcode, name, brand, updated_at) VALUES (?, ?, ?, ?, ?);',
      [product.id, product.barcode, product.name, product.brand ?? null, product.updatedAt],
    );

    return product;
  },

  async ensureByBarcode(barcode: string): Promise<Product> {
    const existing = await this.getByBarcode(barcode);
    if (existing) {
      return existing;
    }

    const db = await getDatabase();
    const product: Product = {
      id: makeId('product'),
      barcode,
      name: `Unknown product (${barcode})`,
      brand: null,
      updatedAt: new Date().toISOString(),
    };

    await db.runAsync(
      'INSERT INTO products (id, barcode, name, brand, updated_at) VALUES (?, ?, ?, ?, ?);',
      [product.id, product.barcode, product.name, product.brand ?? null, product.updatedAt],
    );

    return product;
  },

  async updateProductName(id: string, name: string, brand?: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE products SET name = ?, brand = ?, updated_at = ? WHERE id = ?;',
      [name, brand ?? null, new Date().toISOString(), id],
    );
  },
};
