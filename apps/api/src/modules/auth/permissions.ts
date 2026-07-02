import type { UserRole } from '@prisma/client';

/** Permisos del sistema (mismos nombres que el frontend). */
export type Permission =
  | 'sell'
  | 'open_cash'
  | 'close_cash'
  | 'register_expenses'
  | 'create_discount'
  | 'cancel_sale'
  | 'create_return'
  | 'edit_products'
  | 'adjust_stock'
  | 'manage_purchases'
  | 'view_reports'
  | 'manage_users'
  | 'manage_settings'
  | 'view_audit'
  | 'reset_demo';

const ALL: Permission[] = [
  'sell', 'open_cash', 'close_cash', 'register_expenses', 'create_discount', 'cancel_sale',
  'create_return', 'edit_products', 'adjust_stock', 'manage_purchases', 'view_reports',
  'manage_users', 'manage_settings', 'view_audit', 'reset_demo',
];

/**
 * Permisos por rol. Por ahora se derivan del rol; cuando el sistema soporte permisos
 * personalizados por usuario, esto se combina con los del registro del usuario.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ALL,
  manager: [
    'sell', 'open_cash', 'close_cash', 'register_expenses', 'create_discount', 'cancel_sale',
    'create_return', 'edit_products', 'adjust_stock', 'manage_purchases', 'view_reports',
  ],
  seller: ['sell'],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
