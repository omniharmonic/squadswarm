export interface ApiClientConfig {
  baseUrl: string;
  token: string;
}

/**
 * Make an authenticated API call to the SquadSwarm app.
 */
export async function apiCall<T = unknown>(
  config: ApiClientConfig,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}
