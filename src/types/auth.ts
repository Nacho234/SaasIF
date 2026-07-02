export type Role = 'admin' | 'manager' | 'seller';

export type Permission =
  | 'sell'
  | 'open_cash'
  | 'close_cash'
  | 'reopen_cash'
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Permisos efectivos. Parten del rol pero pueden personalizarse por usuario. */
  permissions: Permission[];
  status: 'active' | 'inactive';
  avatarColor: string;
  lastLoginAt: string | null;
  createdAt: string;
}
