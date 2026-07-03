import type { Customer, PaymentMethodId } from '@/types';
import { isProdMode } from '@/config/appMode';
import { useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import { useCashStore } from '@/store/cashStore';
import { generateId } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { logAudit } from './auditService';
import { getOpenRegister } from './cashRegisterService';
import { customersApi, type CustomerWriteInput } from './api/customersApiService';
import { registerDebtPaymentSupabase } from './supabase/supabaseAccountService';
import { toast } from '@/store/uiStore';

/**
 * Facade CRUD de clientes: en prod habla con el backend y refleja en el store (caché reactiva);
 * en demo opera sobre el store local. Lo usan las pantallas de gestión de clientes.
 */

/** Carga los clientes del backend al store (solo prod). En demo ya está sembrado. */
export async function loadCustomers(): Promise<void> {
  if (!isProdMode) return;
  const customers = await customersApi.list();
  useCustomerStore.getState().replaceAll({ customers });
}

export async function createCustomer(input: CustomerWriteInput): Promise<Customer> {
  if (isProdMode) {
    const customer = await customersApi.create(input);
    useCustomerStore.getState().addCustomer(customer);
    return customer;
  }
  const now = new Date().toISOString();
  const customer: Customer = {
    id: generateId(),
    name: input.name,
    phone: input.phone ?? '',
    email: input.email ?? '',
    document: input.document ?? '',
    cuit: input.cuit ?? '',
    address: input.address ?? '',
    birthDate: input.birthDate ?? null,
    notes: input.notes ?? '',
    tags: input.tags ?? [],
    isActive: true,
    debtBalance: 0,
    createdAt: now,
    updatedAt: now,
  };
  useCustomerStore.getState().addCustomer(customer);
  logAudit({ action: 'customer_created', module: 'customers', description: `Creó el cliente "${customer.name}"`, severity: 'success' });
  return customer;
}

export async function updateCustomerData(id: string, patch: Partial<Customer>): Promise<Customer | void> {
  if (isProdMode) {
    const customer = await customersApi.update(id, {
      name: patch.name ?? undefined,
      phone: patch.phone,
      email: patch.email,
      document: patch.document,
      cuit: patch.cuit,
      address: patch.address,
      birthDate: patch.birthDate,
      notes: patch.notes,
      tags: patch.tags,
      isActive: patch.isActive,
    } as CustomerWriteInput);
    useCustomerStore.getState().updateCustomer(id, customer);
    return customer;
  }
  useCustomerStore.getState().updateCustomer(id, patch);
}

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
  const paymentId = generateId();
  const amount = round2(input.amount);
  adjustDebt(customer.id, -input.amount);
  addPayment({
    id: paymentId,
    customerId: customer.id,
    amount,
    method: input.method,
    date: now,
    userId: user.id,
    userName: user.name,
    notes: input.notes,
  });

  // Si hay caja abierta, el pago entra como ingreso.
  const register = getOpenRegister();
  let cashMovementForRpc: { cashRegisterId: string; method: PaymentMethodId; amount: number; reason: string } | null = null;
  if (register && input.method !== 'customer_credit') {
    const reason = `Pago de deuda de ${customer.name}`;
    cashMovementForRpc = { cashRegisterId: register.id, method: input.method, amount, reason };
    useCashStore.getState().addMovement({
      id: generateId(),
      cashRegisterId: register.id,
      type: 'debt_payment',
      direction: 'in',
      amount,
      method: input.method,
      reason,
      userId: user.id,
      userName: user.name,
      relatedSaleId: null,
      date: now,
      notes: input.notes,
    });
  }

  if (isProdMode) {
    void registerDebtPaymentSupabase({
      id: paymentId,
      customerId: customer.id,
      amount,
      method: input.method,
      userId: user.id,
      userName: user.name,
      notes: input.notes,
      cashMovement: cashMovementForRpc,
    }).catch(() => toast.error('No se pudo sincronizar el pago', 'Quedó local; reintentá.'));
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
