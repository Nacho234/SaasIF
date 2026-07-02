import type { CashRegisterStatus, PurchaseStatus, SaleStatus } from '@/types';
import { CASH_MOVEMENT_LABELS, PURCHASE_STATUS_LABELS, SALE_STATUS_LABELS } from '@/constants/labels';
import type { CashMovementType } from '@/types';
import { Badge } from './Badge';

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const variant = (
    {
      paid: 'success',
      pending: 'warning',
      cancelled: 'danger',
      partially_returned: 'info',
      returned: 'default',
    } as const
  )[status];
  return <Badge variant={variant}>{SALE_STATUS_LABELS[status]}</Badge>;
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const variant = ({ draft: 'default', sent: 'info', received: 'success', cancelled: 'danger' } as const)[status];
  return <Badge variant={variant}>{PURCHASE_STATUS_LABELS[status]}</Badge>;
}

export function CashStatusBadge({ status }: { status: CashRegisterStatus }) {
  if (status === 'open') return <Badge variant="success" dot>Abierta</Badge>;
  if (status === 'closed') return <Badge variant="default">Cerrada</Badge>;
  return <Badge variant="warning">Cerrada con diferencia</Badge>;
}

export function CashMovementBadge({ type }: { type: CashMovementType }) {
  const variant = (
    {
      opening: 'primary',
      sale: 'success',
      manual_income: 'success',
      manual_expense: 'danger',
      expense: 'danger',
      withdrawal: 'warning',
      refund: 'warning',
      cancellation: 'danger',
      debt_payment: 'info',
      correction: 'info',
      closing: 'default',
    } as const
  )[type];
  return <Badge variant={variant}>{CASH_MOVEMENT_LABELS[type]}</Badge>;
}

export function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock <= 0) return <Badge variant="danger">Sin stock</Badge>;
  if (stock <= minStock) return <Badge variant="warning">Bajo stock</Badge>;
  return <Badge variant="success">{stock} u.</Badge>;
}
