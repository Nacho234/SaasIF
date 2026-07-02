import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../permissions';

export const PERMISSION_KEY = 'requiredPermission';

/** Exige un permiso para ejecutar el endpoint (validado en backend, no en el frontend). */
export const RequirePermission = (permission: Permission) => SetMetadata(PERMISSION_KEY, permission);
