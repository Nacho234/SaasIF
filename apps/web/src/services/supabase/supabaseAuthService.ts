import type { Role, User } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS } from '@/constants/permissions';
import { supabase } from './supabaseClient';
import type { LoginInput, RegisterInput, Session } from '../api/authApiService';

/** Traduce errores comunes de Supabase Auth a mensajes claros en español. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ya existe una cuenta con ese email.';
  if (m.includes('at least 6')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('email') && m.includes('invalid')) return 'El email no es válido.';
  return message;
}

function toUser(id: string, email: string, name: string, roleRaw: string): User {
  const role = (['admin', 'manager', 'seller'].includes(roleRaw) ? roleRaw : 'admin') as Role;
  return {
    id,
    name: name || email,
    email,
    role,
    permissions: DEFAULT_ROLE_PERMISSIONS[role],
    status: 'active',
    avatarColor: '#2563eb',
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

/** Arma la Session del frontend a partir de la sesión de Supabase + el profile (creado por el trigger). */
async function buildSession(): Promise<Session> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error('No se pudo iniciar sesión.');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, businessId, name, role')
    .eq('id', session.user.id)
    .single();
  if (error || !profile) throw new Error('No se encontró el perfil del usuario. Reintentá en unos segundos.');

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', profile.businessId)
    .single();

  return {
    user: toUser(profile.id, session.user.email ?? '', profile.name, profile.role),
    token: session.access_token,
    businessId: profile.businessId as string,
    businessName: business?.name ?? '',
  };
}

export async function registerSupabase(input: RegisterInput): Promise<Session> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { business_name: input.businessName, owner_name: input.ownerName } },
  });
  if (error) throw new Error(friendlyError(error.message));
  if (!data.session) {
    // Confirmación de email activada: no hay sesión hasta verificar el mail.
    throw new Error('Te enviamos un email para confirmar la cuenta. Confirmalo y volvé a iniciar sesión.');
  }
  return buildSession();
}

export async function loginSupabase(input: LoginInput): Promise<Session> {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new Error(friendlyError(error.message));
  return buildSession();
}

export async function logoutSupabase(): Promise<void> {
  await supabase.auth.signOut();
}

/** Restaura la sesión si Supabase todavía tiene una válida (al recargar la app). */
export async function restoreSupabaseSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return buildSession();
}
