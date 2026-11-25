let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Unable to connect to the server. Please check your connection and try again.');
  }

  const rawText = await response.text().catch(() => '');
  let data: (T & { error?: string }) | null = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as T & { error?: string };
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (data?.error) {
      throw new Error(data.error);
    }
    if (response.status === 404) {
      throw new Error('Authentication service unavailable. Please refresh the page or ensure the app server is running.');
    }
    if (response.status === 401) {
      throw new Error('Invalid credentials or expired session. Please sign in again.');
    }
    throw new Error(`Unable to complete request (${response.status}). Please try again.`);
  }

  return (data ?? {}) as T;
}
