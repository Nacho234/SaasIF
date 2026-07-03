import type { Purchase, Supplier } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useSupplierStore } from '@/store/supplierStore';
import { supabase } from './supabaseClient';
import { toast } from '@/store/uiStore';

function biz(): string {
  return useAuthStore.getState().businessId ?? '';
}
const n = (v: unknown): number => Number(v ?? 0);

function toSupplier(s: Record<string, unknown>): Supplier {
  return {
    id: s.id as string,
    name: (s.name as string) ?? '',
    phone: (s.phone as string) ?? '',
    email: (s.email as string) ?? '',
    cuit: (s.cuit as string) ?? '',
    address: (s.address as string) ?? '',
    contactName: (s.contactName as string) ?? '',
    notes: (s.notes as string) ?? '',
    isActive: Boolean(s.isActive),
    createdAt: (s.createdAt as string) ?? new Date().toISOString(),
  };
}
function toPurchase(p: Record<string, unknown>): Purchase {
  return {
    id: p.id as string,
    number: (p.number as string) ?? '',
    supplierId: (p.supplierId as string) ?? '',
    supplierName: (p.supplierName as string) ?? '',
    date: (p.date as string) ?? new Date().toISOString(),
    items: (p.items as Purchase['items']) ?? [],
    subtotal: n(p.subtotal),
    total: n(p.total),
    status: p.status as Purchase['status'],
    notes: (p.notes as string) ?? '',
    createdById: (p.createdById as string) ?? '',
    createdByName: (p.createdByName as string) ?? '',
    receivedAt: (p.receivedAt as string) ?? null,
  };
}

export async function loadSuppliers(): Promise<void> {
  if (!biz()) return;
  const [supRes, purRes] = await Promise.all([
    supabase.from('suppliers').select('*').order('name', { ascending: true }),
    supabase.from('purchases').select('*').order('date', { ascending: false }),
  ]);
  useSupplierStore.getState().replaceAll({
    suppliers: (supRes.data ?? []).map(toSupplier),
    purchases: (purRes.data ?? []).map(toPurchase),
  });
}

function mirror(p: PromiseLike<{ error: unknown }>, what: string): void {
  void Promise.resolve(p).then(({ error }) => {
    if (error) toast.error('No se pudo sincronizar', `Fallo al guardar ${what} en el servidor.`);
  });
}

export function mirrorSupplier(s: Supplier): void {
  mirror(
    supabase.from('suppliers').upsert({
      id: s.id, businessId: biz(), name: s.name, phone: s.phone, email: s.email, cuit: s.cuit,
      address: s.address, contactName: s.contactName, notes: s.notes, isActive: s.isActive,
    }),
    'el proveedor',
  );
}
export function mirrorPurchase(p: Purchase): void {
  mirror(
    supabase.from('purchases').upsert({
      id: p.id, businessId: biz(), number: p.number, supplierId: p.supplierId || null,
      supplierName: p.supplierName, date: p.date, items: p.items, subtotal: p.subtotal, total: p.total,
      status: p.status, notes: p.notes, createdById: p.createdById, createdByName: p.createdByName,
      receivedAt: p.receivedAt,
    }),
    'la compra',
  );
}

/** Recibir compra: RPC atómica (suma stock + costo, marca recibida). */
export async function receivePurchaseSupabase(
  purchaseId: string,
  stockUpdates: { productId: string; quantity: number; unitCost: number }[],
): Promise<void> {
  const { error } = await supabase.rpc('receive_purchase', { payload: { purchaseId, stockUpdates } });
  if (error) throw new Error(error.message);
}
