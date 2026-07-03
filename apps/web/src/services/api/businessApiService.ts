import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase/supabaseClient';
import { ApiError } from './apiClient';

/**
 * Elimina el negocio del usuario logueado (irreversible). Re-valida la contraseña con
 * Supabase Auth y borra el negocio (RLS permite solo el propio; cascade borra todo lo asociado).
 * La confirmación "ELIMINAR" la valida el modal antes de llamar acá.
 */
export async function deleteBusinessApi(password: string, _confirmation: string): Promise<{ ok: true }> {
  const email = useAuthStore.getState().user?.email;
  const businessId = useAuthStore.getState().businessId;
  if (!email || !businessId) throw new ApiError(401, 'No hay una sesión activa.');

  // Re-verificar la contraseña reintentando el login.
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new ApiError(401, 'Contraseña incorrecta.');

  const { error } = await supabase.from('businesses').delete().eq('id', businessId);
  if (error) throw new ApiError(400, error.message);
  return { ok: true };
}
