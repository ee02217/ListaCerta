import {
  PriceSchema,
  ProductSchema,
  ProductsArraySchema,
  type Price,
  type Product,
} from '@listacerta/shared-types';

import { API_BASE_URL } from './config';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed (${response.status}): ${path}`);
    }

    return (await response.json()) as T;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export const productApi = {
  async fetchByBarcode(barcode: string): Promise<Product> {
    const payload = await apiClient.request<unknown>(`/products/${encodeURIComponent(barcode)}`);
    return ProductSchema.parse(payload);
  },

  async search(query?: string): Promise<Product[]> {
    const path = query?.trim()
      ? `/products?q=${encodeURIComponent(query.trim())}&limit=50`
      : '/products?limit=50';

    const payload = await apiClient.request<unknown>(path);
    return ProductsArraySchema.parse(payload);
  },
};

export const priceApi = {
  async fetchBestPrice(productId: string): Promise<Price> {
    const payload = await apiClient.request<unknown>(`/prices/best/${productId}`);
    return PriceSchema.parse(payload);
  },

  // Placeholder for future sync endpoint.
  async syncPendingPrices() {
    throw new Error('Not implemented yet: priceApi.syncPendingPrices');
  },
};
