import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types';

/**
 * Inyecta el usuario autenticado en el controlador.
 * `businessId` SIEMPRE se toma de acá (del token), nunca de datos que mande el frontend.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
  return request.user;
});
