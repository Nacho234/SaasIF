import { apiFetch } from './apiClient';

/** Elimina el negocio del usuario logueado (irreversible). Requiere contraseña + confirmación. */
export function deleteBusinessApi(password: string, confirmation: string): Promise<{ ok: true }> {
  return apiFetch('/business', { method: 'DELETE', body: { password, confirmation } });
}
