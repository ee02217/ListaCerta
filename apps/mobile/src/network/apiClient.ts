import {
  PriceAggregationSchema,
  PriceSchema,
  PriceSubmissionResultSchema,
  ProductSchema,
  ProductsArraySchema,
  StoresArraySchema,
  type Price,
  type PriceAggregation,
  type PriceSubmissionResult,
  type Product,
  type Store,
} from '@listacerta/shared-types';

import { API_BASE_URL } from './config';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly responseBody?: string,
  ) {
    super(`API request failed (${status}) for ${url}${responseBody ? `: ${responseBody}` : ''}`);
    this.name = 'ApiHttpError';
  }
}

class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown network error';
      throw new Error(
        `Network request failed (${url}). Check API base URL and phone network. Cause: ${reason}`,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ApiHttpError(response.status, url, body);
    }

    return (await response.json()) as T;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

type SaveProductInput = {
  barcode?: string;
  name?: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  source?: 'OFF' | 'manual';
};

export const productApi = {
  async fetchByBarcode(barcode: string): Promise<Product> {
    const payload = await apiClient.request<unknown>(`/products/barcode/${encodeURIComponent(barcode)}`);
    return ProductSchema.parse(payload);
  },

  async search(query?: string): Promise<Product[]> {
    const path = query?.trim()
      ? `/products?q=${encodeURIComponent(query.trim())}&limit=50`
      : '/products?limit=50';

    const payload = await apiClient.request<unknown>(path);
    return ProductsArraySchema.parse(payload);
  },

  async createManualProduct(input: SaveProductInput): Promise<Product> {
    const payload = await apiClient.request<unknown>('/products', {
      method: 'POST',
      body: {
        ...input,
        source: input.source ?? 'manual',
      },
    });

    return ProductSchema.parse(payload);
  },

  async updateProduct(productId: string, input: SaveProductInput): Promise<Product> {
    const payload = await apiClient.request<unknown>(`/products/${productId}`, {
      method: 'PATCH',
      body: input,
    });

    return ProductSchema.parse(payload);
  },
};

export const storeApi = {
  async listStores(): Promise<Store[]> {
    const payload = await apiClient.request<unknown>('/stores');
    return StoresArraySchema.parse(payload);
  },
};

export const priceApi = {
  async fetchBestPrice(productId: string): Promise<PriceAggregation> {
    const payload = await apiClient.request<unknown>(`/prices/best/${productId}`);
    return PriceAggregationSchema.parse(payload);
  },

  async submitPrice(input: {
    productId: string;
    storeId: string;
    priceCents: number;
    currency: string;
    capturedAt: string;
    status?: 'active' | 'flagged';
    photoUrl?: string | null;
  }): Promise<PriceSubmissionResult> {
    const payload = await apiClient.request<unknown>('/prices', {
      method: 'POST',
      body: {
        productId: input.productId,
        storeId: input.storeId,
        priceCents: input.priceCents,
        currency: input.currency,
        capturedAt: input.capturedAt,
        status: input.status ?? 'active',
        photoUrl: input.photoUrl ?? null,
      },
    });

    return PriceSubmissionResultSchema.parse(payload);
  },

  // Placeholder for future sync endpoint.
  async syncPendingPrices() {
    throw new Error('Not implemented yet: priceApi.syncPendingPrices');
  },
};
