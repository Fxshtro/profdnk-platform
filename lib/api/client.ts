import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function messageFromApiErrorPayload(data: unknown): string | null {
  if (data == null) return null;

  if (typeof data === 'string') {
    const t = data.trim();
    if (!t) return null;
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        return messageFromApiErrorPayload(JSON.parse(t));
      } catch {
        return t;
      }
    }
    return t;
  }

  if (typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;

  if (typeof o.detail === 'string') {
    return o.detail;
  }

  if (Array.isArray(o.detail)) {
    const parts = o.detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg?: string }).msg ?? '').trim();
        }
        return '';
      })
      .filter(Boolean);
    return parts.length ? parts.join(' ') : null;
  }

  if (typeof o.message === 'string') {
    return o.message;
  }

  if (Array.isArray(o.errors)) {
    const parts = o.errors.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    if (parts.length) return parts.join('\n');
  }

  return null;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      messageFromApiErrorPayload(errorData) ??
      `Не удалось выполнить запрос (код ${response.status})`;

    throw new ApiError(response.status, msg, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, 'Network error. Please check your connection.');
  }
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
