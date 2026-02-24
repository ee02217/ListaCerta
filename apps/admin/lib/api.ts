const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:3001';
const internalApiBaseUrl = process.env.API_INTERNAL_BASE_URL?.trim() || 'http://api:3001';

const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    return internalApiBaseUrl;
  }

  return publicApiBaseUrl;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

export { publicApiBaseUrl as API_BASE_URL };
