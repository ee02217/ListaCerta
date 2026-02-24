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
  barcode: string;
  name: string;
  brand?: string | null;
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
