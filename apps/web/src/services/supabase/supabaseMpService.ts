import { supabase } from './supabaseClient';

export interface MpStatus {
  connected: boolean;
  nickname: string;
  email: string;
  mpUserId: string;
}

/** Estado de la conexión de Mercado Pago del negocio (el token nunca llega acá). */
export async function getMpStatus(): Promise<MpStatus> {
  const { data } = await supabase
    .from('mp_connections')
    .select('connected, nickname, email, mpUserId')
    .maybeSingle();
  return {
    connected: Boolean(data?.connected),
    nickname: (data?.nickname as string) ?? '',
    email: (data?.email as string) ?? '',
    mpUserId: (data?.mpUserId as string) ?? '',
  };
}

/** Inicia el OAuth: pide la URL de autorización a la Edge Function y la devuelve. */
export async function startMpConnect(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('mp-oauth-start', { body: {} });
  const url = (data as { url?: string } | null)?.url;
  if (error || !url) throw new Error(error?.message ?? 'No se pudo iniciar la conexión con Mercado Pago.');
  return url;
}

/** Desvincula la cuenta de Mercado Pago del negocio (borra la conexión y el token). */
export async function disconnectMp(): Promise<void> {
  const { error } = await supabase.rpc('mp_disconnect');
  if (error) throw new Error(error.message);
}
