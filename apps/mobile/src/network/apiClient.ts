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

// Intentionally left as stubs until backend contracts are finalized.
export const productApi = {
  async fetchByBarcode(_barcode: string) {
    throw new Error('Not implemented yet: productApi.fetchByBarcode');
  },
};

export const priceApi = {
  async syncPendingPrices() {
    throw new Error('Not implemented yet: priceApi.syncPendingPrices');
  },
};
