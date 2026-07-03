import type {
  CashClosure,
  CashMovement,
  CashMovementType,
  CashRegister,
  PaymentMethodId,
  PaymentMethodVerification,
} from '@/types';
import { selectOpenRegister, useCashStore } from '@/store/cashStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { generateCashNumber, generateId } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { logAudit } from './auditService';
import { pushNotification } from './notificationService';
import { getStockSummaryForRegister, nextClosureVersion } from './cashClosureService';
import { ROUTES } from '@/constants/routes';
import { isProdMode } from '@/config/appMode';
import { mirrorClosure, mirrorMovement, mirrorRegister } from './supabase/supabaseCashService';

export interface RegisterSummary {
  movements: CashMovement[];
  salesCount: number;
  salesByMethod: Partial<Record<PaymentMethodId, number>>;
  salesTotal: number;
  manualIncome: number;
  expensesTotal: number;
  withdrawals: number;
  refunds: number;
  cancellations: number;
  debtPayments: number;
  expectedCash: number;
  totalIn: number;
  totalOut: number;
}

export function getOpenRegister(): CashRegister | undefined {
  return selectOpenRegister(useCashStore.getState());
}

export function getRegisterSummary(registerId: string): RegisterSummary {
  const movements = useCashStore
    .getState()
    .movements.filter((m) => m.cashRegisterId === registerId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const summary: RegisterSummary = {
    movements,
    salesCount: 0,
    salesByMethod: {},
    salesTotal: 0,
    manualIncome: 0,
    expensesTotal: 0,
    withdrawals: 0,
    refunds: 0,
    cancellations: 0,
    debtPayments: 0,
    expectedCash: 0,
    totalIn: 0,
    totalOut: 0,
  };

  const saleIds = new Set<string>();
  for (const m of movements) {
    if (m.direction === 'in') summary.totalIn = round2(summary.totalIn + m.amount);
    else summary.totalOut = round2(summary.totalOut + m.amount);

    if (m.method === 'cash') {
      summary.expectedCash = round2(summary.expectedCash + (m.direction === 'in' ? m.amount : -m.amount));
    }

    switch (m.type) {
      case 'sale':
        summary.salesTotal = round2(summary.salesTotal + m.amount);
        summary.salesByMethod[m.method] = round2((summary.salesByMethod[m.method] ?? 0) + m.amount);
        if (m.relatedSaleId) saleIds.add(m.relatedSaleId);
        break;
      case 'manual_income':
        summary.manualIncome = round2(summary.manualIncome + m.amount);
        break;
      case 'expense':
      case 'manual_expense':
        summary.expensesTotal = round2(summary.expensesTotal + m.amount);
        break;
      case 'withdrawal':
        summary.withdrawals = round2(summary.withdrawals + m.amount);
        break;
      case 'refund':
        summary.refunds = round2(summary.refunds + m.amount);
        break;
      case 'cancellation':
        summary.cancellations = round2(summary.cancellations + m.amount);
        break;
      case 'debt_payment':
        summary.debtPayments = round2(summary.debtPayments + m.amount);
        break;
      default:
        break;
    }
  }
  summary.salesCount = saleIds.size;
  return summary;
}

export function openRegister(input: { openingAmount: number; notes: string }): {
  ok: boolean;
  error?: string;
  register?: CashRegister;
} {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  if (input.openingAmount < 0) return { ok: false, error: 'El monto inicial no puede ser negativo.' };
  if (getOpenRegister()) return { ok: false, error: 'La caja ya está abierta.' };

  const store = useCashStore.getState();
  const now = new Date().toISOString();
  const register: CashRegister = {
    id: generateId(),
    number: generateCashNumber(store.nextRegisterCounter()),
    openedAt: now,
    closedAt: null,
    openedById: user.id,
    openedByName: user.name,
    closedById: null,
    closedByName: null,
    openingAmount: round2(input.openingAmount),
    expectedCash: null,
    countedCash: null,
    difference: null,
    status: 'open',
    openingNotes: input.notes,
    closingNotes: '',
  };
  const openingMovement = {
    id: generateId(),
    cashRegisterId: register.id,
    type: 'opening' as const,
    direction: 'in' as const,
    amount: register.openingAmount,
    method: 'cash' as const,
    reason: 'Apertura de caja',
    userId: user.id,
    userName: user.name,
    relatedSaleId: null,
    date: now,
    notes: input.notes,
  };
  store.addRegister(register);
  store.addMovement(openingMovement);
  if (isProdMode) {
    mirrorRegister(register);
    mirrorMovement(openingMovement);
  }
  logAudit({
    action: 'cash_opened',
    module: 'cash',
    description: `Abrió la caja ${register.number} con monto inicial`,
    severity: 'success',
    metadata: { register: register.number, openingAmount: register.openingAmount },
  });
  return { ok: true, register };
}

export function addCashMovement(input: {
  type: Extract<CashMovementType, 'manual_income' | 'manual_expense' | 'withdrawal' | 'correction'>;
  amount: number;
  method: PaymentMethodId;
  reason: string;
  notes?: string;
  direction?: 'in' | 'out';
}): { ok: boolean; error?: string } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  const register = getOpenRegister();
  if (!register) return { ok: false, error: 'No hay caja abierta.' };
  if (input.amount <= 0) return { ok: false, error: 'El monto debe ser mayor a cero.' };
  const needsReason = input.type !== 'manual_income';
  if (needsReason && !input.reason.trim()) {
    return { ok: false, error: 'El motivo es obligatorio para egresos, retiros y correcciones.' };
  }

  const direction =
    input.type === 'manual_income' ? 'in' : input.type === 'correction' ? (input.direction ?? 'in') : 'out';

  const movement = {
    id: generateId(),
    cashRegisterId: register.id,
    type: input.type,
    direction,
    amount: round2(input.amount),
    method: input.method,
    reason: input.reason.trim() || 'Ingreso manual',
    userId: user.id,
    userName: user.name,
    relatedSaleId: null,
    date: new Date().toISOString(),
    notes: input.notes ?? '',
  };
  useCashStore.getState().addMovement(movement);
  if (isProdMode) mirrorMovement(movement);
  logAudit({
    action: 'cash_movement',
    module: 'cash',
    description: `Registró un movimiento de caja (${input.type})`,
    metadata: { amount: input.amount, type: input.type },
  });
  return { ok: true };
}

export interface CloseRegisterInput {
  countedCash: number | null;
  notes: string;
  paymentVerifications?: PaymentMethodVerification[];
  employeeSignature?: string | null;
  managerSignature?: string | null;
}

export interface CloseRegisterResult {
  ok: boolean;
  error?: string;
  register?: CashRegister;
  closure?: CashClosure;
}

/**
 * Cierra la caja abierta aplicando las reglas de configuración (arqueo, diferencia,
 * terminales, firmas), persiste un snapshot inmutable (CashClosure) y deja auditoría.
 * Sirve tanto para el primer cierre como para un cierre posterior a una reapertura.
 */
export function closeRegister(input: CloseRegisterInput): CloseRegisterResult {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  const register = getOpenRegister();
  if (!register) return { ok: false, error: 'No hay caja abierta para cerrar.' };

  const { settings } = useBusinessStore.getState();

  // Arqueo obligatorio.
  if (settings.requireCashCount && (input.countedCash == null || Number.isNaN(input.countedCash))) {
    return { ok: false, error: 'El arqueo es obligatorio: ingresá el efectivo contado.' };
  }
  const countedCash = input.countedCash == null || Number.isNaN(input.countedCash) ? 0 : input.countedCash;
  if (countedCash < 0) return { ok: false, error: 'El efectivo contado no puede ser negativo.' };

  const summary = getRegisterSummary(register.id);
  const difference = round2(countedCash - summary.expectedCash);

  // Reglas de diferencia.
  if (difference !== 0 && !settings.allowCloseWithDifference) {
    return { ok: false, error: 'No se permite cerrar caja con diferencia. Revisá el arqueo.' };
  }
  if (difference !== 0 && settings.requireNoteOnCashDifference && !input.notes.trim()) {
    return { ok: false, error: 'Hay una diferencia de caja: la observación es obligatoria.' };
  }

  // Cierre de terminales obligatorio si la configuración lo pide.
  const terminals = useCashStore.getState().terminalClosures.filter((t) => t.cashRegisterId === register.id);
  if (settings.requireTerminalClosure && terminals.length === 0) {
    return { ok: false, error: 'La configuración exige cargar el cierre de terminales antes de cerrar la caja.' };
  }

  // Firmas obligatorias.
  if (settings.requireEmployeeSignature && !input.employeeSignature?.trim()) {
    return { ok: false, error: 'Falta la firma del empleado.' };
  }
  if (settings.requireManagerSignature && !input.managerSignature?.trim()) {
    return { ok: false, error: 'Falta la firma del encargado.' };
  }

  const now = new Date().toISOString();
  const store = useCashStore.getState();
  const closingMovement = {
    id: generateId(),
    cashRegisterId: register.id,
    type: 'closing' as const,
    direction: 'out' as const,
    amount: 0,
    method: 'cash' as const,
    reason: 'Cierre de caja',
    userId: user.id,
    userName: user.name,
    relatedSaleId: null,
    date: now,
    notes: input.notes,
  };
  store.addMovement(closingMovement);
  const status = difference === 0 ? ('closed' as const) : ('closed_with_difference' as const);
  const registerPatch = {
    closedAt: now,
    closedById: user.id,
    closedByName: user.name,
    expectedCash: summary.expectedCash,
    countedCash: round2(countedCash),
    difference,
    status,
    closingNotes: input.notes,
  };
  store.updateRegister(register.id, registerPatch);

  // Snapshot inmutable (Hoja de Cierre Diario).
  const stock = getStockSummaryForRegister(register.id);
  const salesTotal = round2(Object.values(summary.salesByMethod).reduce((a, b) => a + (b ?? 0), 0));
  const closure: CashClosure = {
    id: generateId(),
    cashRegisterId: register.id,
    registerNumber: register.number,
    version: nextClosureVersion(register.id),
    openedAt: register.openedAt,
    closedAt: now,
    openedByName: register.openedByName,
    closedByName: user.name,
    openingAmount: register.openingAmount,
    expectedCash: summary.expectedCash,
    countedCash: round2(countedCash),
    cashDifference: difference,
    salesCount: summary.salesCount,
    salesTotal,
    salesByMethod: summary.salesByMethod,
    manualIncome: summary.manualIncome,
    expensesTotal: summary.expensesTotal,
    withdrawals: summary.withdrawals,
    refunds: summary.refunds,
    cancellations: summary.cancellations,
    debtPayments: summary.debtPayments,
    // ARCA no conectado: todo se considera ticket interno.
    internalTicketsTotal: salesTotal,
    fiscalInvoicesTotal: 0,
    paymentVerifications: input.paymentVerifications ?? [],
    terminalClosures: terminals,
    unitsSold: stock.unitsSold,
    productsSoldCount: stock.productsSoldCount,
    inventoryMovementsCount: stock.inventoryMovementsCount,
    employeeSignature: input.employeeSignature?.trim() || null,
    managerSignature: input.managerSignature?.trim() || null,
    notes: input.notes,
    status,
    createdAt: now,
  };
  store.addClosure(closure);

  if (isProdMode) {
    mirrorMovement(closingMovement);
    mirrorRegister({ ...register, ...registerPatch });
    mirrorClosure(closure);
  }

  logAudit({
    action: 'cash_closed',
    module: 'cash',
    description:
      difference === 0
        ? `Cerró la caja ${register.number} sin diferencias`
        : `Cerró la caja ${register.number} con diferencia`,
    severity: difference === 0 ? 'success' : 'warning',
    metadata: { register: register.number, expected: summary.expectedCash, counted: countedCash, difference },
  });
  if (difference !== 0) {
    pushNotification({
      title: `Cierre con diferencia en ${register.number}`,
      description: `Diferencia de caja detectada al cerrar. Revisá el detalle.`,
      type: 'cash_difference',
      actionUrl: ROUTES.cashDetail(register.id),
    });
  }
  const updated = useCashStore.getState().registers.find((r) => r.id === register.id);
  return { ok: true, register: updated, closure };
}
