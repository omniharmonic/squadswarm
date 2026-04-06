export interface ApiClientConfig {
  baseUrl: string;
  token: string;
}

export async function apiCall<T = unknown>(
  config: ApiClientConfig,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.token}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      `API ${method} ${path} failed (${res.status}): ${(error as Record<string, unknown>).error || JSON.stringify(error)}`,
    );
  }

  return res.json() as Promise<T>;
}
