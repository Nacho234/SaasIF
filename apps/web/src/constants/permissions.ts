import type { Permission, Role } from '@/types';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  manager: 'Encargado',
  seller: 'Vendedor',
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  sell: 'Vender',
  open_cash: 'Abrir caja',
  close_cash: 'Cerrar caja',
  reopen_cash: 'Reabrir caja',
  register_expenses: 'Registrar gastos',
  create_discount: 'Aplicar descuentos',
  cancel_sale: 'Anular ventas',
  create_return: 'Hacer devoluciones',
  edit_products: 'Crear y editar productos',
  adjust_stock: 'Ajustar stock',
  manage_purchases: 'Proveedores y compras',
  view_reports: 'Ver reportes',
  manage_users: 'Administrar usuarios',
  manage_settings: 'Modificar configuración',
  view_audit: 'Ver auditoría',
  reset_demo: 'Resetear datos demo',
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  manager: [
    'sell',
    'open_cash',
    'close_cash',
    'register_expenses',
    'create_discount',
    'cancel_sale',
    'create_return',
    'edit_products',
    'adjust_stock',
    'manage_purchases',
    'view_reports',
  ],
  seller: ['sell'],
};
