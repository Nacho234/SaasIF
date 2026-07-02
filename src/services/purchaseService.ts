import { useAuthStore } from '@/store/authStore';
import { useSupplierStore } from '@/store/supplierStore';
import { useProductStore } from '@/store/productStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { generateId } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { logAudit } from './auditService';

/**
 * Costo promedio ponderado: mezcla el costo del stock existente con el de la
 * mercadería que ingresa. Si no hay stock previo, rige el costo nuevo.
 */
export function weightedAverageCost(
  previousStock: number,
  previousCost: number,
  incomingQuantity: number,
  incomingCost: number,
): number {
  if (previousStock <= 0 || previousCost <= 0) return round2(incomingCost);
  const totalUnits = previousStock + incomingQuantity;
  if (totalUnits <= 0) return round2(incomingCost);
  return round2((previousStock * previousCost + incomingQuantity * incomingCost) / totalUnits);
}

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
    const newCost = weightedAverageCost(previous, product.costPrice, item.quantity, item.unitCost);
    productStore.updateProduct(product.id, { stock: next, costPrice: newCost });
    inventoryStore.addMovement({
      id: generateId(),
      productId: product.id,
      productName: product.name,
      type: 'purchase',
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
    });
  }

  updatePurchase(purchase.id, { status: 'received', receivedAt: now });
  logAudit({
    action: 'purchase_received',
    module: 'purchases',
    description: `Recibió la compra ${purchase.number} de ${purchase.supplierName}`,
    severity: 'success',
    metadata: { purchase: purchase.number, total: purchase.total },
  });
  return { ok: true };
}
