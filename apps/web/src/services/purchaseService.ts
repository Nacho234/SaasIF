import { useAuthStore } from '@/store/authStore';
import { useSupplierStore } from '@/store/supplierStore';
import { useProductStore } from '@/store/productStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { generateId } from '@/utils/id';
import { logAudit } from './auditService';
import { isProdMode } from '@/config/appMode';
import { receivePurchaseSupabase } from './supabase/supabaseSuppliersService';
import { mirrorMovement as mirrorInventoryMovement } from './supabase/supabaseInventoryService';
import { toast } from '@/store/uiStore';

/** Marca una compra como recibida: suma stock y actualiza costos. */
export function receivePurchase(purchaseId: string): { ok: boolean; error?: string } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  const { purchases, updatePurchase } = useSupplierStore.getState();
  const purchase = purchases.find((p) => p.id === purchaseId);
  if (!purchase) return { ok: false, error: 'Compra no encontrada.' };
  if (purchase.status === 'received') return { ok: false, error: 'La compra ya fue recibida.' };
  if (purchase.status === 'cancelled') return { ok: false, error: 'La compra está cancelada.' };

  const now = new Date().toISOString();
  const productStore = useProductStore.getState();
  const inventoryStore = useInventoryStore.getState();

  for (const item of purchase.items) {
    const product = useProductStore.getState().products.find((p) => p.id === item.productId);
    if (!product) continue;
    const previous = product.stock;
    const next = previous + item.quantity;
    productStore.updateProduct(product.id, { stock: next, costPrice: item.unitCost });
    const movement = {
      id: generateId(),
      productId: product.id,
      productName: product.name,
      type: 'purchase' as const,
      quantity: item.quantity,
      previousStock: previous,
      newStock: next,
      reason: `Compra ${purchase.number} recibida`,
      userId: user.id,
      userName: user.name,
      relatedSaleId: null,
      relatedPurchaseId: purchase.id,
      date: now,
      notes: '',
    };
    inventoryStore.addMovement(movement);
    if (isProdMode) mirrorInventoryMovement(movement);
  }

  updatePurchase(purchase.id, { status: 'received', receivedAt: now });

  if (isProdMode) {
    const stockUpdates = purchase.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitCost: i.unitCost,
    }));
    void receivePurchaseSupabase(purchase.id, stockUpdates).catch(() =>
      toast.error('No se pudo sincronizar la recepción', 'Quedó local; reintentá.'),
    );
  }

  logAudit({
    action: 'purchase_received',
    module: 'purchases',
    description: `Recibió la compra ${purchase.number} de ${purchase.supplierName}`,
    severity: 'success',
    metadata: { purchase: purchase.number, total: purchase.total },
  });
  return { ok: true };
}
