import { supabase } from './supabaseClient';

/** Estado de la conexión de Mercado Pago del negocio (el token nunca llega acá). */
export async function getMpStatus(): Promise<{ connected: boolean; nickname: string }> {
  const { data } = await supabase.from('mp_connections').select('connected, nickname').maybeSingle();
  return { connected: Boolean(data?.connected), nickname: (data?.nickname as string) ?? '' };
}

/** Inicia el OAuth: pide la URL de autorización a la Edge Function y la devuelve. */
export async function startMpConnect(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('mp-oauth-start', { body: {} });
  const url = (data as { url?: string } | null)?.url;
  if (error || !url) throw new Error(error?.message ?? 'No se pudo iniciar la conexión con Mercado Pago.');
  return url;
}
