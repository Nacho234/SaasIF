import type { PaymentMethodId } from './business';

export type SaleStatus = 'paid' | 'pending' | 'cancelled' | 'partially_returned' | 'returned';

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  /** Descuento en $ aplicado a la línea completa. */
  discount: number;
  subtotal: number;
  isCombo: boolean;
  comboId: string | null;
  /** Snapshot de componentes por unidad de combo (para restock en anulaciones/devoluciones). */
  comboComponents: { productId: string; productName: string; quantity: number }[] | null;
  /** Cantidad ya devuelta de esta línea. */
  returnedQuantity: number;
}

export interface Payment {
  id: string;
  method: PaymentMethodId;
  amount: number;
  reference: string;
  cardLast4: string;
  installments: number;
  status: 'approved' | 'pending';
}

export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  customerId: string | null;
  customerName: string | null;
  sellerId: string;
  sellerName: string;
  cashRegisterId: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  surchargeTotal: number;
  total: number;
  payments: Payment[];
  /** Monto recibido en efectivo (para calcular vuelto). */
  cashReceived: number | null;
  change: number;
  status: SaleStatus;
  notes: string;
  promotionId: string | null;
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string;
}

export type ReturnReason = 'defective' | 'exchange' | 'sale_error' | 'regret' | 'other';
export type RefundMethod = 'cash' | 'transfer' | 'credit_note' | 'exchange' | 'none';

export interface ReturnItem {
  saleItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  restock: boolean;
}

export interface SaleReturn {
  id: string;
  saleId: string;
  saleNumber: string;
  items: ReturnItem[];
  reason: ReturnReason;
  refundMethod: RefundMethod;
  refundAmount: number;
  userId: string;
  userName: string;
  date: string;
  notes: string;
}
