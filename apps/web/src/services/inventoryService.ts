import type { InventoryMovementType } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useProductStore } from '@/store/productStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { generateId } from '@/utils/id';
import { logAudit } from './auditService';
import { checkStockAlerts } from './notificationService';
import { isProdMode } from '@/config/appMode';
import { mirrorMovement, persistStock } from './supabase/supabaseInventoryService';

/** Ingreso/egreso/ajuste manual de stock. */
export function adjustStock(input: {
  productId: string;
  type: Extract<InventoryMovementType, 'manual_in' | 'manual_out' | 'adjust_up' | 'adjust_down' | 'correction'>;
  quantity: number;
  reason: string;
  notes?: string;
}): { ok: boolean; error?: string } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  if (!user.permissions.includes('adjust_stock')) {
    return { ok: false, error: 'Este usuario no tiene permiso para ajustar stock.' };
  }
  if (input.quantity <= 0) return { ok: false, error: 'La cantidad debe ser mayor a cero.' };
  if (!input.reason.trim()) return { ok: false, error: 'El motivo es obligatorio en ajustes manuales.' };

  const product = useProductStore.getState().products.find((p) => p.id === input.productId);
  if (!product) return { ok: false, error: 'Producto no encontrado.' };

  const isIn = input.type === 'manual_in' || input.type === 'adjust_up' || input.type === 'correction';
  const next = isIn ? product.stock + input.quantity : product.stock - input.quantity;
  const { settings } = useBusinessStore.getState();
  if (next < 0 && !settings.allowNegativeStock) {
    return { ok: false, error: `No hay stock suficiente (disponible: ${product.stock}).` };
  }

  useProductStore.getState().setStock(product.id, next);
  const movement = {
    id: generateId(),
    productId: product.id,
    productName: product.name,
    type: input.type,
    quantity: input.quantity,
    previousStock: product.stock,
    newStock: next,
    reason: input.reason.trim(),
    userId: user.id,
    userName: user.name,
    relatedSaleId: null,
    relatedPurchaseId: null,
    date: new Date().toISOString(),
    notes: input.notes ?? '',
  };
  useInventoryStore.getState().addMovement(movement);
  if (isProdMode) {
    persistStock(product.id, next); // el ajuste manual sí cambia el stock en Supabase
    mirrorMovement(movement);
  }
  if (!isIn) checkStockAlerts({ ...product, stock: next });

  logAudit({
    action: 'stock_adjusted',
    module: 'inventory',
    description: `Ajustó el stock de "${product.name}" (${product.stock} → ${next})`,
    metadata: { product: product.name, type: input.type, quantity: input.quantity },
  });
  return { ok: true };
}
