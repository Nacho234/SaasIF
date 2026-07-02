import type { UserRole } from '@prisma/client';

/** Payload que viaja dentro del JWT. */
export interface JwtPayload {
  sub: string; // userId
  businessId: string;
  role: UserRole;
  email: string;
}

/** Usuario autenticado que el backend adjunta a la request tras validar el JWT. */
export interface AuthUser {
  id: string;
  businessId: string;
  role: UserRole;
  email: string;
}
