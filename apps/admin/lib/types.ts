export type Product = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  source: 'OFF' | 'manual';
  createdAt: string;
  updatedAt: string;
};

export type Store = {
  id: string;
  name: string;
  location: string | null;
};

export type Device = {
  id: string;
  createdAt: string;
};

export type DeviceUsage = {
  id: string;
  createdAt: string;
  submissionsCount: number;
  lastUsedAt: string | null;
};

export type ModerationPrice = {
  id: string;
  productId: string;
  storeId: string;
  priceCents: number;
  currency: string;
  capturedAt: string;
  submittedBy: string | null;
  photoUrl: string | null;
  status: 'active' | 'flagged';
  confidenceScore: number;
  product: Product;
  store: Store;
  device: Device | null;
};
