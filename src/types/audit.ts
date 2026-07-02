export type AuditSeverity = 'info' | 'success' | 'warning' | 'error';

export type AuditModule =
  | 'auth'
  | 'cash'
  | 'sales'
  | 'returns'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'promotions'
  | 'expenses'
  | 'users'
  | 'settings'
  | 'system';

export interface AuditLog {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: string;
  module: AuditModule;
  description: string;
  severity: AuditSeverity;
  metadata: Record<string, string | number | boolean | null> | null;
}
