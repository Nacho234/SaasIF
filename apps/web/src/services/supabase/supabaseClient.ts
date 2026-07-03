import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase (modo prod). Usa la URL + publishable key (públicas: RLS es lo que
 * protege los datos). En modo demo no se usa (queda null). La sesión se persiste en
 * localStorage y el token se refresca solo.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : (null as unknown as SupabaseClient);

export const isSupabaseConfigured = Boolean(url && key);
