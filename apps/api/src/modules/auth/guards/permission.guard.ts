import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { roleHasPermission, type Permission } from '../permissions';
import type { AuthUser } from '../types';

/**
 * Guard global de permisos. Si el endpoint declara @RequirePermission, valida que el rol
 * del usuario lo tenga. Si no declara permiso, deja pasar (la autenticación ya la hizo JwtAuthGuard).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user) throw new ForbiddenException('No autenticado.');
    if (!roleHasPermission(user.role, required)) {
      throw new ForbiddenException('No tenés permiso para realizar esta acción.');
    }
    return true;
  }
}
