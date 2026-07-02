import type { Customer, PaymentMethodId } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import { useCashStore } from '@/store/cashStore';
import { generateId } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { logAudit } from './auditService';
import { getOpenRegister } from './cashRegisterService';

export function createQuickCustomer(name: string, phone = ''): Customer {
  const now = new Date().toISOString();
  const customer: Customer = {
    id: generateId(),
    name: name.trim(),
    phone,
    email: '',
    document: '',
    cuit: '',
    address: '',
    birthDate: null,
    notes: '',
    tags: ['POS'],
    isActive: true,
    debtBalance: 0,
    createdAt: now,
    updatedAt: now,
  };
  useCustomerStore.getState().addCustomer(customer);
  logAudit({
    action: 'customer_created',
    module: 'customers',
    description: `Creó el cliente rápido "${customer.name}" desde el POS`,
  });
  return customer;
}

export function registerDebtPayment(input: {
  customerId: string;
  amount: number;
  method: PaymentMethodId;
  notes: string;
}): { ok: boolean; error?: string } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  const { customers, adjustDebt, addPayment } = useCustomerStore.getState();
  const customer = customers.find((c) => c.id === input.customerId);
  if (!customer) return { ok: false, error: 'Cliente no encontrado.' };
  if (input.amount <= 0) return { ok: false, error: 'El monto debe ser mayor a cero.' };
  if (input.amount > customer.debtBalance) {
    return { ok: false, error: 'El monto supera la deuda actual del cliente.' };
  }

  const now = new Date().toISOString();
  adjustDebt(customer.id, -input.amount);
  addPayment({
    id: generateId(),
    customerId: customer.id,
    amount: round2(input.amount),
    method: input.method,
    date: now,
    userId: user.id,
    userName: user.name,
    notes: input.notes,
  });

  // Si hay caja abierta, el pago entra como ingreso.
  const register = getOpenRegister();
  if (register && input.method !== 'customer_credit') {
    useCashStore.getState().addMovement({
      id: generateId(),
      cashRegisterId: register.id,
      type: 'debt_payment',
      direction: 'in',
      amount: round2(input.amount),
      method: input.method,
      reason: `Pago de deuda de ${customer.name}`,
      userId: user.id,
      userName: user.name,
      relatedSaleId: null,
      date: now,
      notes: input.notes,
    });
  }

  logAudit({
    action: 'debt_payment',
    module: 'customers',
    description: `Registró un pago de deuda de ${customer.name}`,
    severity: 'success',
    metadata: { customer: customer.name, amount: input.amount },
  });
  return { ok: true };
}
