import type { InventoryMovement } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { supabase } from './supabaseClient';

function biz(): string {
  return useAuthStore.getState().businessId ?? '';
}

/** Registra un movimiento de inventario en Supabase (log del kardex). Fire-and-forget. */
export function mirrorMovement(m: InventoryMovement): void {
  void supabase
    .from('inventory_movements')
    .insert({
      id: m.id,
      businessId: biz(),
      productId: m.productId,
      productName: m.productName,
      type: m.type,
      quantity: m.quantity,
      previousStock: m.previousStock,
      newStock: m.newStock,
      reason: m.reason,
      userId: m.userId,
      userName: m.userName,
      relatedSaleId: m.relatedSaleId,
      relatedPurchaseId: m.relatedPurchaseId,
      date: m.date,
      notes: m.notes,
    })
    .then(({ error }) => {
      if (error) console.error('inventory_movement insert', error.message);
    });
}

/** Ajuste manual de stock: persiste products.stock en Supabase (el cambio real). */
export function persistStock(productId: string, newStock: number): void {
  void supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId)
    .then(({ error }) => {
      if (error) console.error('stock update', error.message);
    });
}

/** Rellena el historial de inventario desde Supabase (solo prod). */
export async function loadInventoryMovements(): Promise<void> {
  if (!biz()) return;
  const { data } = await supabase
    .from('inventory_movements')
    .select('*')
    .order('date', { ascending: false })
    .limit(1000);
  const movements: InventoryMovement[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    productId: (r.productId as string) ?? '',
    productName: (r.productName as string) ?? '',
    type: r.type as InventoryMovement['type'],
    quantity: Number(r.quantity ?? 0),
    previousStock: Number(r.previousStock ?? 0),
    newStock: Number(r.newStock ?? 0),
    reason: (r.reason as string) ?? '',
    userId: (r.userId as string) ?? '',
    userName: (r.userName as string) ?? '',
    relatedSaleId: (r.relatedSaleId as string) ?? null,
    relatedPurchaseId: (r.relatedPurchaseId as string) ?? null,
    date: (r.date as string) ?? new Date().toISOString(),
    notes: (r.notes as string) ?? '',
  }));
  useInventoryStore.getState().replaceAll({ movements });
}
