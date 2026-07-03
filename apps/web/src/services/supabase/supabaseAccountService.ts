import type { CustomerPayment } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import { supabase } from './supabaseClient';

/** Registra el pago de deuda de forma atómica en Supabase (baja deuda + pago + caja). */
export async function registerDebtPaymentSupabase(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc('register_debt_payment', { payload });
  if (error) throw new Error(error.message);
}

/** Rellena los pagos de cuenta corriente desde Supabase (solo prod). */
export async function loadCustomerPayments(): Promise<void> {
  if (!useAuthStore.getState().businessId) return;
  const { data } = await supabase.from('customer_payments').select('*').order('date', { ascending: false });
  const payments: CustomerPayment[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    customerId: r.customerId as string,
    amount: Number(r.amount ?? 0),
    method: r.method as CustomerPayment['method'],
    date: (r.date as string) ?? new Date().toISOString(),
    userId: (r.userId as string) ?? '',
    userName: (r.userName as string) ?? '',
    notes: (r.notes as string) ?? '',
  }));
  useCustomerStore.getState().replaceAll({ payments });
}
