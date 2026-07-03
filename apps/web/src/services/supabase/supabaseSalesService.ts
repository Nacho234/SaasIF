import type { Sale, SaleItem } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useSalesStore } from '@/store/salesStore';
import { supabase } from './supabaseClient';

/**
 * Ventas en modo prod. La confirmación de venta usa la RPC atómica `create_sale`
 * (venta + ítems + descuento de stock + movimientos de caja + deuda en una transacción).
 * loadSales rellena el store desde Supabase al entrar.
 */

const n = (v: unknown): number => Number(v ?? 0);

function toItem(r: Record<string, unknown>): SaleItem {
  return {
    id: r.id as string,
    productId: (r.productId as string) ?? '',
    productName: (r.productName as string) ?? '',
    sku: (r.sku as string) ?? '',
    quantity: n(r.quantity),
    unitPrice: n(r.unitPrice),
    costPrice: n(r.costPrice),
    discount: n(r.discount),
    subtotal: n(r.subtotal),
    isCombo: Boolean(r.isCombo),
    comboId: (r.comboId as string) ?? null,
    comboComponents: (r.comboComponents as SaleItem['comboComponents']) ?? null,
    returnedQuantity: n(r.returnedQuantity),
  };
}

function toSale(r: Record<string, unknown>, items: SaleItem[]): Sale {
  return {
    id: r.id as string,
    saleNumber: (r.saleNumber as string) ?? '',
    date: (r.date as string) ?? new Date().toISOString(),
    customerId: (r.customerId as string) ?? null,
    customerName: (r.customerName as string) ?? null,
    sellerId: (r.sellerId as string) ?? '',
    sellerName: (r.sellerName as string) ?? '',
    cashRegisterId: (r.cashRegisterId as string) ?? '',
    items,
    subtotal: n(r.subtotal),
    discountTotal: n(r.discountTotal),
    surchargeTotal: n(r.surchargeTotal),
    total: n(r.total),
    payments: (r.payments as Sale['payments']) ?? [],
    cashReceived: r.cashReceived === null || r.cashReceived === undefined ? null : n(r.cashReceived),
    change: n(r.change),
    status: (r.status as Sale['status']) ?? 'paid',
    notes: (r.notes as string) ?? '',
    promotionId: (r.promotionId as string) ?? null,
    createdAt: (r.createdAt as string) ?? new Date().toISOString(),
    cancelledAt: (r.cancelledAt as string) ?? null,
    cancelReason: (r.cancelReason as string) ?? '',
  };
}

/** Confirma la venta de forma atómica en Supabase. */
export async function createSaleSupabase(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc('create_sale', { payload });
  if (error) throw new Error(error.message);
}

/** Rellena el store de ventas desde Supabase (solo prod). */
export async function loadSales(): Promise<void> {
  if (!useAuthStore.getState().businessId) return;
  const [salesRes, itemsRes] = await Promise.all([
    supabase.from('sales').select('*').order('date', { ascending: false }),
    supabase.from('sale_items').select('*'),
  ]);
  const itemsBySale = new Map<string, SaleItem[]>();
  for (const raw of (itemsRes.data ?? []) as Record<string, unknown>[]) {
    const saleId = raw.saleId as string;
    const arr = itemsBySale.get(saleId) ?? [];
    arr.push(toItem(raw));
    itemsBySale.set(saleId, arr);
  }
  const sales = ((salesRes.data ?? []) as Record<string, unknown>[]).map((s) =>
    toSale(s, itemsBySale.get(s.id as string) ?? []),
  );
  useSalesStore.getState().replaceAll({ sales });
}
