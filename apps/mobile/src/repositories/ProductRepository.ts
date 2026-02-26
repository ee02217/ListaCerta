import { getDatabase } from '../db/client';
import { ApiProduct, Product } from '../domain/models';
import { makeId } from '../utils/id';

type ProductRow = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  updated_at: string;
};

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  barcode: row.barcode,
  name: row.name,
  brand: row.brand,
  category: row.category,
  imageUrl: row.image_url,
  updatedAt: row.updated_at,
});

export const productRepository = {
  async getById(id: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE id = ? LIMIT 1;', [id]);
    return row ? toProduct(row) : null;
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    const normalized = barcode.trim();
    if (!normalized) {
      return null;
    }

    const db = await getDatabase();
    const row = await db.getFirstAsync<ProductRow>(
      'SELECT * FROM products WHERE barcode = ? LIMIT 1;',
      [normalized],
    );
    return row ? toProduct(row) : null;
  },

  async searchLocal(query: string, limit = 20): Promise<Product[]> {
    const normalized = query.trim();
    if (!normalized) {
      return [];
    }

    const db = await getDatabase();
    const like = `%${normalized}%`;

    const rows = await db.getAllAsync<ProductRow>(
      `SELECT * FROM products
       WHERE name LIKE ? COLLATE NOCASE OR brand LIKE ? COLLATE NOCASE
       ORDER BY updated_at DESC
       LIMIT ?;`,
      [like, like, limit],
    );

    return rows.map(toProduct);
  },

  async findByNameAndBrand(name: string, brand?: string | null): Promise<Product | null> {
    const normalizedName = name.trim();
    const normalizedBrand = brand?.trim() || null;

    if (!normalizedName) {
      return null;
    }

    const db = await getDatabase();

    const row = normalizedBrand
      ? await db.getFirstAsync<ProductRow>(
          `SELECT * FROM products
           WHERE lower(name) = lower(?)
             AND lower(COALESCE(brand, '')) = lower(?)
           LIMIT 1;`,
          [normalizedName, normalizedBrand],
        )
      : await db.getFirstAsync<ProductRow>(
          `SELECT * FROM products
           WHERE lower(name) = lower(?)
             AND (brand IS NULL OR trim(brand) = '')
           LIMIT 1;`,
          [normalizedName],
        );

    return row ? toProduct(row) : null;
  },

  async upsertFromApiProduct(apiProduct: ApiProduct): Promise<Product> {
    const db = await getDatabase();
    const existingById = await this.getById(apiProduct.id);
    const existingByBarcode = apiProduct.barcode ? await this.getByBarcode(apiProduct.barcode) : null;

    const target = existingById ?? existingByBarcode;

    if (target) {
      await db.runAsync(
        'UPDATE products SET barcode = ?, name = ?, brand = ?, category = ?, image_url = ?, updated_at = ? WHERE id = ?;',
        [
          apiProduct.barcode ?? null,
          apiProduct.name,
          apiProduct.brand ?? null,
          apiProduct.category ?? null,
          apiProduct.imageUrl ?? null,
          apiProduct.updatedAt,
          target.id,
        ],
      );

      return {
        ...target,
        barcode: apiProduct.barcode ?? null,
        name: apiProduct.name,
        brand: apiProduct.brand,
        category: apiProduct.category,
        imageUrl: apiProduct.imageUrl,
        updatedAt: apiProduct.updatedAt,
      };
    }

    const product: Product = {
      id: apiProduct.id,
      barcode: apiProduct.barcode ?? null,
      name: apiProduct.name,
      brand: apiProduct.brand,
      category: apiProduct.category,
      imageUrl: apiProduct.imageUrl,
      updatedAt: apiProduct.updatedAt,
    };

    await db.runAsync(
      'INSERT INTO products (id, barcode, name, brand, category, image_url, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [
        product.id,
        product.barcode,
        product.name,
        product.brand ?? null,
        product.category ?? null,
        product.imageUrl ?? null,
        product.updatedAt,
      ],
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
      category: null,
      imageUrl: null,
      updatedAt: new Date().toISOString(),
    };

    await db.runAsync(
      'INSERT INTO products (id, barcode, name, brand, category, image_url, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [
        product.id,
        product.barcode,
        product.name,
        product.brand ?? null,
        product.category ?? null,
        product.imageUrl ?? null,
        product.updatedAt,
      ],
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
