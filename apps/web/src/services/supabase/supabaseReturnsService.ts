import type { SaleReturn } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useSalesStore } from '@/store/salesStore';
import { supabase } from './supabaseClient';

/** Confirma la devolución de forma atómica en Supabase (RPC create_return). */
export async function createReturnSupabase(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc('create_return', { payload });
  if (error) throw new Error(error.message);
}

/** Rellena las devoluciones desde Supabase (solo prod). */
export async function loadReturns(): Promise<void> {
  if (!useAuthStore.getState().businessId) return;
  const { data } = await supabase.from('sale_returns').select('*').order('date', { ascending: false });
  const returns: SaleReturn[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    saleId: r.saleId as string,
    saleNumber: (r.saleNumber as string) ?? '',
    items: (r.items as SaleReturn['items']) ?? [],
    reason: r.reason as SaleReturn['reason'],
    refundMethod: r.refundMethod as SaleReturn['refundMethod'],
    refundAmount: Number(r.refundAmount ?? 0),
    userId: (r.userId as string) ?? '',
    userName: (r.userName as string) ?? '',
    date: (r.date as string) ?? new Date().toISOString(),
    notes: (r.notes as string) ?? '',
  }));
  useSalesStore.getState().replaceAll({ returns });
}
