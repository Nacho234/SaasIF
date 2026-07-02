import type {
  CashMovementType,
  ExpenseCategory,
  InventoryMovementType,
  NotificationType,
  PromotionType,
  PurchaseStatus,
  RefundMethod,
  ReturnReason,
  SaleStatus,
} from '@/types';

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  paid: 'Pagada',
  pending: 'Pendiente',
  cancelled: 'Anulada',
  partially_returned: 'Devolución parcial',
  returned: 'Devuelta',
};

export const CASH_MOVEMENT_LABELS: Record<CashMovementType, string> = {
  opening: 'Apertura',
  sale: 'Venta',
  manual_income: 'Ingreso manual',
  manual_expense: 'Egreso manual',
  expense: 'Gasto',
  withdrawal: 'Retiro',
  refund: 'Devolución',
  cancellation: 'Anulación',
  debt_payment: 'Pago de deuda',
  correction: 'Corrección',
  closing: 'Cierre',
};

export const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  initial: 'Carga inicial',
  manual_in: 'Ingreso manual',
  manual_out: 'Egreso manual',
  sale: 'Venta',
  return: 'Devolución',
  adjust_up: 'Ajuste positivo',
  adjust_down: 'Ajuste negativo',
  purchase: 'Compra recibida',
  sale_cancelled: 'Anulación de venta',
  correction: 'Corrección',
};

export const INVENTORY_IN_TYPES: InventoryMovementType[] = [
  'initial',
  'manual_in',
  'return',
  'adjust_up',
  'purchase',
  'sale_cancelled',
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Alquiler',
  services: 'Servicios',
  salaries: 'Sueldos',
  suppliers: 'Proveedores',
  cleaning: 'Limpieza',
  maintenance: 'Mantenimiento',
  advertising: 'Publicidad',
  taxes: 'Impuestos',
  other: 'Otros',
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  received: 'Recibida',
  cancelled: 'Cancelada',
};

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  defective: 'Producto defectuoso',
  exchange: 'Cambio de producto',
  sale_error: 'Error en la venta',
  regret: 'El cliente se arrepintió',
  other: 'Otro motivo',
};

export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  credit_note: 'Crédito a favor',
  exchange: 'Cambio por otro producto',
  none: 'Sin devolución monetaria',
};

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  percentage: 'Descuento %',
  fixed_amount: 'Monto fijo',
  two_for_one: '2x1',
  category_discount: 'Por categoría',
  brand_discount: 'Por marca',
  product_discount: 'Por producto',
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  cash_closed: 'Caja',
  cash_difference: 'Caja',
  low_stock: 'Stock',
  out_of_stock: 'Stock',
  pending_debt: 'Cuenta corriente',
  sale_cancelled: 'Ventas',
  return_created: 'Devoluciones',
  promotion_expiring: 'Promociones',
  purchase_pending: 'Compras',
  offline: 'Conexión',
  validation_error: 'Sistema',
  system: 'Sistema',
};
