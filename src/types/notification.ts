export type NotificationType =
  | 'cash_closed'
  | 'cash_difference'
  | 'low_stock'
  | 'out_of_stock'
  | 'pending_debt'
  | 'sale_cancelled'
  | 'return_created'
  | 'promotion_expiring'
  | 'purchase_pending'
  | 'offline'
  | 'validation_error'
  | 'system';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  read: boolean;
  date: string;
  /** Ruta interna para "ir al módulo relacionado". */
  actionUrl: string | null;
}
