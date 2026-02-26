import type {
  Price as SharedPrice,
  Product as SharedProduct,
  Store as SharedStore,
} from '@listacerta/shared-types';

export type Product = {
  id: string;
  barcode: string | null;
  name: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  updatedAt: string;
};

export type ApiProduct = SharedProduct;

export type Store = {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiStore = SharedStore;

export type Price = SharedPrice;

export type List = {
  id: string;
  name: string;
  createdAt: string;
};

export type ListItem = {
  id: string;
  listId: string;
  title: string;
  done: boolean;
  quantity: number;
  createdAt: string;
};

export type PriceWithStore = {
  id: string;
  productId: string;
  storeId: string;
  storeName: string;
  amountCents: number;
  currency: string;
  observedAt: string;
  status: string;
};
