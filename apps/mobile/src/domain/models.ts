import type {
  Price as SharedPrice,
  Product as SharedProduct,
  Store as SharedStore,
} from '@listacerta/shared-types';

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

export type Product = {
  id: string;
  barcode: string | null;
  name: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  updatedAt: string;
};

export type Store = {
  id: string;
  name: string;
  updatedAt: string;
};

export type Price = {
  id: string;
  productId: string;
  storeId: string;
  amountCents: number;
  currency: string;
  observedAt: string;
};

export type PriceWithStore = Price & {
  storeName: string;
};

export type ApiProduct = SharedProduct;
export type ApiStore = SharedStore;
export type ApiPrice = SharedPrice;
