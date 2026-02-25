export type Product = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  source: 'OFF' | 'manual';
  cachedAt: string | null;
  isVerified: boolean;
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

export type AnalyticsSummary = {
  totals: {
    products: number;
    prices: number;
  };
  mostActiveStores: Array<{
    storeId: string;
    name: string;
    submissionsCount: number;
  }>;
  mostScannedProducts: Array<{
    productId: string;
    name: string;
    barcode: string;
    scansCount: number;
  }>;
  generatedAt: string;
};
