import type { PaymentMethodId } from './business';

export type CashRegisterStatus = 'open' | 'closed' | 'closed_with_difference' | 'reopened' | 'cancelled';

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

/** Procesadores de pago electrónico soportados en el cierre de terminales. */
export type ProcessorId =
  | 'posnet'
  | 'lapos'
  | 'payway'
  | 'viumi'
  | 'mercadopago_point'
  | 'getnet'
  | 'fiserv'
  | 'other';

/** Verificación de un medio de pago electrónico durante el cierre. */
export interface PaymentMethodVerification {
  method: PaymentMethodId;
  /** Total registrado por el sistema para ese medio en el turno. */
  systemAmount: number;
  verified: boolean;
  note: string;
}

/**
 * Cierre de una terminal / lote (Posnet, LaPos, Payway, etc.).
 * Concilia los totales electrónicos del sistema contra lo informado por la terminal.
 */
export interface TerminalClosure {
  id: string;
  cashRegisterId: string;
  processor: ProcessorId;
  /** Identificación de la terminal, ej. "Caja 1". */
  terminalLabel: string;
  /** Número de lote informado por la terminal. */
  batchNumber: string;
  /** Número de cierre / operación. */
  closingNumber: string;
  systemDebit: number;
  terminalDebit: number;
  debitDifference: number;
  systemCredit: number;
  terminalCredit: number;
  creditDifference: number;
  systemQr: number;
  terminalQr: number;
  qrDifference: number;
  totalSystem: number;
  totalTerminal: number;
  totalDifference: number;
  notes: string;
  createdById: string;
  createdByName: string;
  date: string;
}

/**
 * Snapshot inmutable del cierre de caja ("Hoja de Cierre Diario").
 * Foto de todos los totales al momento de cerrar; la hoja imprimible lee de acá,
 * no recalcula. Una reapertura + nuevo cierre genera otra versión (version N+1).
 */
export interface CashClosure {
  id: string;
  cashRegisterId: string;
  registerNumber: string;
  /** Versión del cierre para el mismo turno (aumenta al reabrir y volver a cerrar). */
  version: number;
  openedAt: string;
  closedAt: string;
  openedByName: string;
  closedByName: string;
  openingAmount: number;
  // Efectivo
  expectedCash: number;
  countedCash: number;
  cashDifference: number;
  // Ventas
  salesCount: number;
  salesTotal: number;
  salesByMethod: Partial<Record<PaymentMethodId, number>>;
  // Otros movimientos
  manualIncome: number;
  expensesTotal: number;
  withdrawals: number;
  refunds: number;
  cancellations: number;
  debtPayments: number;
  // Fiscal (ARCA no conectado: todo es ticket interno por ahora)
  internalTicketsTotal: number;
  fiscalInvoicesTotal: number;
  // Verificación de medios y terminales
  paymentVerifications: PaymentMethodVerification[];
  terminalClosures: TerminalClosure[];
  // Stock / movimientos
  unitsSold: number;
  productsSoldCount: number;
  inventoryMovementsCount: number;
  // Control
  employeeSignature: string | null;
  managerSignature: string | null;
  notes: string;
  status: CashRegisterStatus;
  createdAt: string;
}
