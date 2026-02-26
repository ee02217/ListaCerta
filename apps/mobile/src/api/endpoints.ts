import {
  PriceAggregationSchema,
  PriceSubmissionResultSchema,
  ProductSchema,
  ProductsArraySchema,
  StoreSchema,
  StoresArraySchema,
  type PriceAggregation,
  type PriceSubmissionResult,
  type Product,
  type Store,
} from '@listacerta/shared-types';

import { apiClient, type ApiRequestOptions } from './client';

export type SaveProductInput = {
  barcode?: string | null;
  name?: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  source?: 'OFF' | 'manual';
};

export type SubmitPriceInput = {
  productId: string;
  storeId: string;
  priceCents: number;
  currency: string;
  capturedAt: string;
  status?: 'active' | 'flagged';
  photoUrl?: string | null;
  idempotencyKey?: string;
  submittedBy?: string;
};

export type HealthResponse = {
  status: string;
  service?: string;
  timestamp?: string;
};

const requestJson = <T>(path: string, options?: ApiRequestOptions) => apiClient.requestJson<T>(path, options);

export const getHealth = async (): Promise<HealthResponse> => {
  const payload = await requestJson<unknown>('/health', {
    method: 'GET',
  });

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid health check payload from backend');
  }

  const result = payload as Record<string, unknown>;
  return {
    status: typeof result.status === 'string' ? result.status : 'unknown',
    service: typeof result.service === 'string' ? result.service : undefined,
    timestamp: typeof result.timestamp === 'string' ? result.timestamp : undefined,
  };
};

export const getProductByBarcode = async (barcode: string): Promise<Product> => {
  const payload = await requestJson<unknown>(`/products/barcode/${encodeURIComponent(barcode)}`);
  return ProductSchema.parse(payload);
};

export const getProductById = async (id: string): Promise<Product> => {
  const payload = await requestJson<unknown>(`/products/id/${encodeURIComponent(id)}`);
  return ProductSchema.parse(payload);
};

export const searchProducts = async (
  query: string,
  limit = 50,
  options?: { signal?: AbortSignal },
): Promise<Product[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const payload = await requestJson<unknown>(
    `/products/search?q=${encodeURIComponent(trimmed)}&limit=${encodeURIComponent(String(limit))}`,
    {
      signal: options?.signal,
    },
  );

  return ProductsArraySchema.parse(payload);
};

export const createManualProduct = async (input: SaveProductInput): Promise<Product> => {
  const payload = await requestJson<unknown>('/products', {
    method: 'POST',
    body: {
      ...input,
      source: input.source ?? 'manual',
    },
  });

  return ProductSchema.parse(payload);
};

export const updateProduct = async (productId: string, input: SaveProductInput): Promise<Product> => {
  const payload = await requestJson<unknown>(`/products/${productId}`, {
    method: 'PATCH',
    body: input,
  });

  return ProductSchema.parse(payload);
};

export const listStores = async (): Promise<Store[]> => {
  const payload = await requestJson<unknown>('/stores');
  return StoresArraySchema.parse(payload);
};

export const createStore = async (input: { name: string; location?: string | null }): Promise<Store> => {
  const payload = await requestJson<unknown>('/stores', {
    method: 'POST',
    body: {
      name: input.name,
      location: input.location ?? null,
    },
  });

  return StoreSchema.parse(payload);
};

export const submitPrice = async (input: SubmitPriceInput): Promise<PriceSubmissionResult> => {
  const payload = await requestJson<unknown>('/prices', {
    method: 'POST',
    body: {
      productId: input.productId,
      storeId: input.storeId,
      priceCents: input.priceCents,
      currency: input.currency,
      capturedAt: input.capturedAt,
      status: input.status ?? 'active',
      photoUrl: input.photoUrl ?? null,
      idempotencyKey: input.idempotencyKey ?? undefined,
      submittedBy: input.submittedBy ?? undefined,
    },
  });

  return PriceSubmissionResultSchema.parse(payload);
};

export const getBestPrice = async (productId: string): Promise<PriceAggregation> => {
  const payload = await requestJson<unknown>(`/prices/best/${productId}`);
  return PriceAggregationSchema.parse(payload);
};

export const getPriceHistory = async (productId: string): Promise<PriceAggregation['priceHistory']> => {
  const payload = await requestJson<unknown>(`/prices/history/${productId}`);
  return PriceAggregationSchema.shape.priceHistory.parse(payload);
};

// Compatibility exports used by existing screens/services.
export const productApi = {
  fetchByBarcode: getProductByBarcode,
  fetchById: getProductById,
  search: searchProducts,
  createManualProduct,
  updateProduct,
};

export const storeApi = {
  listStores,
  createStore,
};

export const priceApi = {
  fetchBestPrice: getBestPrice,
  fetchHistory: getPriceHistory,
  submitPrice,
  async syncPendingPrices() {
    throw new Error('Not implemented yet: priceApi.syncPendingPrices');
  },
};

export const healthApi = {
  check: getHealth,
};
