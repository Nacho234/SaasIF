import type { Expense, ExpenseCategory, PaymentMethodId } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useCashStore } from '@/store/cashStore';
import { generateId } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { logAudit } from './auditService';
import { getOpenRegister } from './cashRegisterService';
import { EXPENSE_CATEGORY_LABELS } from '@/constants/labels';

export function registerExpense(input: {
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethodId;
  attachToCash: boolean;
  notes: string;
}): { ok: boolean; error?: string; expense?: Expense } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  if (!user.permissions.includes('register_expenses')) {
    return { ok: false, error: 'Este usuario no tiene permiso para registrar gastos.' };
  }
  if (input.amount <= 0) return { ok: false, error: 'El monto debe ser mayor a cero.' };
  if (!input.description.trim()) return { ok: false, error: 'La descripción es obligatoria.' };

  const register = input.attachToCash ? getOpenRegister() : undefined;
  const now = new Date().toISOString();
  const expense: Expense = {
    id: generateId(),
    category: input.category,
    description: input.description.trim(),
    amount: round2(input.amount),
    date: now,
    paymentMethod: input.paymentMethod,
    cashRegisterId: register?.id ?? null,
    userId: user.id,
    userName: user.name,
    status: 'active',
    notes: input.notes,
  };
  useExpenseStore.getState().addExpense(expense);

  if (register) {
    useCashStore.getState().addMovement({
      id: generateId(),
      cashRegisterId: register.id,
      type: 'expense',
      direction: 'out',
      amount: expense.amount,
      method: input.paymentMethod,
      reason: `Gasto: ${expense.description}`,
      userId: user.id,
      userName: user.name,
      relatedSaleId: null,
      date: now,
      notes: input.notes,
    });
  }

  logAudit({
    action: 'expense_created',
    module: 'expenses',
    description: `Registró un gasto de ${EXPENSE_CATEGORY_LABELS[input.category]}`,
    metadata: { amount: expense.amount, category: input.category, attachedToCash: Boolean(register) },
  });
  return { ok: true, expense };
}

export function voidExpense(expenseId: string): { ok: boolean; error?: string } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  const { expenses, updateExpense } = useExpenseStore.getState();
  const expense = expenses.find((e) => e.id === expenseId);
  if (!expense) return { ok: false, error: 'Gasto no encontrado.' };
  if (expense.status === 'void') return { ok: false, error: 'El gasto ya está anulado.' };

  updateExpense(expenseId, { status: 'void' });

  // Si estaba asociado a la caja abierta, se corrige con un ingreso.
  const register = getOpenRegister();
  if (register && expense.cashRegisterId === register.id) {
    useCashStore.getState().addMovement({
      id: generateId(),
      cashRegisterId: register.id,
      type: 'correction',
      direction: 'in',
      amount: expense.amount,
      method: expense.paymentMethod,
      reason: `Anulación de gasto: ${expense.description}`,
      userId: user.id,
      userName: user.name,
      relatedSaleId: null,
      date: new Date().toISOString(),
      notes: '',
    });
  }

  logAudit({
    action: 'expense_voided',
    module: 'expenses',
    description: `Anuló el gasto "${expense.description}"`,
    severity: 'warning',
    metadata: { amount: expense.amount },
  });
  return { ok: true };
}
