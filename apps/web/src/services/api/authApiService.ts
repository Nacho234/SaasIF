import type { Role, User } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS } from '@/constants/permissions';
import { apiFetch } from './apiClient';

/** Forma de la respuesta de auth del backend. */
interface AuthResponse {
  token: string;
  user: { id: string; name: string; email: string; role: string; businessId: string };
  business: { id: string; name: string };
}

export interface RegisterInput {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface Session {
  user: User;
  token: string;
  businessId: string;
  businessName: string;
}

/**
 * Mapea el usuario del backend (que trae rol pero no lista de permisos) al `User`
 * del frontend, derivando los permisos del rol. Cuando el backend soporte permisos
 * por usuario, se reemplaza este mapeo.
 */
function toFrontendUser(u: AuthResponse['user']): User {
  const role = (['admin', 'manager', 'seller'].includes(u.role) ? u.role : 'seller') as Role;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role,
    permissions: DEFAULT_ROLE_PERMISSIONS[role],
    status: 'active',
    avatarColor: '#2563eb',
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function toSession(res: AuthResponse): Session {
  return {
    user: toFrontendUser(res.user),
    token: res.token,
    businessId: res.business.id,
    businessName: res.business.name,
  };
}

export async function registerApi(input: RegisterInput): Promise<Session> {
  const res = await apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false });
  return toSession(res);
}

export async function loginApi(input: LoginInput): Promise<Session> {
  const res = await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false });
  return toSession(res);
}
