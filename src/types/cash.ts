import type { PaymentMethodId } from './business';

export type CashRegisterStatus = 'open' | 'closed' | 'closed_with_difference';

export type CashMovementType =
  | 'opening'
  | 'sale'
  | 'manual_income'
  | 'manual_expense'
  | 'expense'
  | 'withdrawal'
  | 'refund'
  | 'cancellation'
  | 'debt_payment'
  | 'correction'
  | 'closing';

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: CashMovementType;
  direction: 'in' | 'out';
  amount: number;
  method: PaymentMethodId;
  reason: string;
  userId: string;
  userName: string;
  relatedSaleId: string | null;
  date: string;
  notes: string;
}

export interface CashRegister {
  id: string;
  /** Número secuencial legible: CJ-0001. */
  number: string;
  openedAt: string;
  closedAt: string | null;
  openedById: string;
  openedByName: string;
  closedById: string | null;
  closedByName: string | null;
  openingAmount: number;
  /** Efectivo esperado al momento del cierre. */
  expectedCash: number | null;
  countedCash: number | null;
  difference: number | null;
  status: CashRegisterStatus;
  openingNotes: string;
  closingNotes: string;
}
