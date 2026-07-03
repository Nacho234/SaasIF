import type { User } from '@/types';

/** Tipos compartidos de auth (la implementación real vive en supabase/supabaseAuthService). */

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
