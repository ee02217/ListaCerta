const DEFAULT_API_BASE_URL = 'https://products.sasnas.duckdns.org:1443';
const DEFAULT_TIMEOUT_MS = 10_000;
const REQUEST_ID_HEADER = 'x-request-id';

const normalizeBaseUrl = (input: string): string => input.trim().replace(/\/+$/, '');

const fallbackUuid = (): string => {
  const randomHex = (size: number) =>
    Array.from({ length: size }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-a${randomHex(3)}-${randomHex(12)}`;
};

const createRequestId = (): string => {
  const maybeCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (typeof maybeCrypto?.randomUUID === 'function') {
    return maybeCrypto.randomUUID();
  }

  return fallbackUuid();
};

const resolveApiBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  return normalizeBaseUrl(fromEnv || DEFAULT_API_BASE_URL);
};

export const API_BASE_URL = resolveApiBaseUrl();

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  withRequestId?: boolean;
  requestId?: string;
};

class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly method: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiTimeoutError extends ApiClientError {
  constructor(url: string, method: string, timeoutMs: number, requestId?: string) {
    super(`API request timed out after ${timeoutMs}ms (${method} ${url})`, url, method, requestId);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiNetworkError extends ApiClientError {
  constructor(url: string, method: string, reason: string, requestId?: string) {
    super(`Network request failed (${method} ${url}): ${reason}`, url, method, requestId);
    this.name = 'ApiNetworkError';
  }
}

export class ApiHttpError extends ApiClientError {
  constructor(
    public readonly status: number,
    url: string,
    method: string,
    public readonly responseBody?: string,
    requestId?: string,
  ) {
    super(
      `API request failed (${status}) for ${method} ${url}${responseBody ? `: ${responseBody}` : ''}`,
      url,
      method,
      requestId,
    );
    this.name = 'ApiHttpError';
  }
}

export class ApiParseError extends ApiClientError {
  constructor(url: string, method: string, responseBody: string, requestId?: string) {
    super(`Failed to parse API JSON response for ${method} ${url}`, url, method, requestId);
    this.name = 'ApiParseError';
    this.responseBody = responseBody;
  }

  public readonly responseBody: string;
}

export class ApiClient {
  constructor(public readonly baseUrl: string) {}

  async requestJson<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const url = `${this.baseUrl}${path}`;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const withRequestId = options.withRequestId ?? true;
    const requestId = withRequestId ? options.requestId ?? createRequestId() : undefined;

    const controller = new AbortController();
    let didTimeout = false;

    const timeoutHandle = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    const relayAbort = () => controller.abort();
    options.signal?.addEventListener('abort', relayAbort);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
        ...(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}),
      };

      console.info(`[api] ${method} ${url}${requestId ? ` [${requestId}]` : ''}`);

      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const raw = await response.text();

      if (!response.ok) {
        console.error(`[api] ${method} ${url} -> ${response.status}${requestId ? ` [${requestId}]` : ''}`);
        throw new ApiHttpError(response.status, url, method, raw, requestId);
      }

      if (!raw) {
        return undefined as T;
      }

      try {
        return JSON.parse(raw) as T;
      } catch {
        throw new ApiParseError(url, method, raw, requestId);
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      if (didTimeout) {
        throw new ApiTimeoutError(url, method, timeoutMs, requestId);
      }

      const reason = error instanceof Error ? error.message : 'Unknown network error';
      throw new ApiNetworkError(url, method, reason, requestId);
    } finally {
      clearTimeout(timeoutHandle);
      options.signal?.removeEventListener('abort', relayAbort);
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
