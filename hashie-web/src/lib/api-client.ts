export type AdminRole = 'admin' | 'super_admin' | 'content_reviewer' | 'support_agent' | 'auditor';

export type ApiClient = {
  get: <T>(path: string) => Promise<T>;
  mutate: <T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) => Promise<T>;
};

export function createAdminApiClient(getToken: () => Promise<string | null>, baseUrl = process.env.HASHIE_API_URL ?? 'http://localhost:3000'): ApiClient {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getToken();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init?.headers },
    });
    if (!response.ok) throw new Error(`Admin request failed (${response.status})`);
    return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
  }
  return {
    get: path => request(path),
    mutate: (path, method, body) => request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
  };
}
