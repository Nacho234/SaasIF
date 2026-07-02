import { useAuthStore } from '@/store/authStore';

/** URL base del backend. Se configura con VITE_API_URL (default: backend local en dev). */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  /** Si false, no adjunta el token (para login/register). */
  auth?: boolean;
}

/**
 * Cliente HTTP del backend. Adjunta el JWT del store, normaliza errores y
 * cierra la sesión si el backend responde 401 (token vencido/ inválido).
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const token = auth ? useAuthStore.getState().token : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    // Token vencido o inválido: cerramos sesión para forzar re-login.
    useAuthStore.getState().clearSession();
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    let code: string | undefined;
    try {
      const data = (await res.json()) as { message?: string | string[]; code?: string };
      message = Array.isArray(data.message) ? data.message.join(' ') : (data.message ?? message);
      code = data.code;
    } catch {
      // respuesta sin JSON
    }
    throw new ApiError(res.status, message, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
