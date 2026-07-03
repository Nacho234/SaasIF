import type { RefundMethod, ReturnItem, ReturnReason, SaleReturn } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useSalesStore } from '@/store/salesStore';
import { useProductStore } from '@/store/productStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useCashStore } from '@/store/cashStore';
import { useCustomerStore } from '@/store/customerStore';
import { generateId } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { logAudit } from './auditService';
import { pushNotification } from './notificationService';
import { getOpenRegister } from './cashRegisterService';
import { ROUTES } from '@/constants/routes';
import { isProdMode } from '@/config/appMode';
import { createReturnSupabase } from './supabase/supabaseReturnsService';
import { toast } from '@/store/uiStore';

export interface ReturnDraft {
  saleId: string;
  items: ReturnItem[];
  reason: ReturnReason;
  refundMethod: RefundMethod;
  notes: string;
}

export function createReturn(draft: ReturnDraft): { ok: boolean; error?: string; ret?: SaleReturn } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  if (!user.permissions.includes('create_return')) {
    return { ok: false, error: 'Este usuario no tiene permiso para hacer devoluciones.' };
  }

  const salesStore = useSalesStore.getState();
  const sale = salesStore.sales.find((s) => s.id === draft.saleId);
  if (!sale) return { ok: false, error: 'Venta no encontrada.' };
  if (sale.status === 'cancelled') return { ok: false, error: 'No se puede devolver una venta anulada.' };
  if (draft.items.length === 0 || draft.items.every((i) => i.quantity <= 0)) {
    return { ok: false, error: 'Seleccioná al menos un producto a devolver.' };
  }

  // Valida cantidades contra lo ya devuelto.
  for (const retItem of draft.items) {
    const saleItem = sale.items.find((i) => i.id === retItem.saleItemId);
    if (!saleItem) return { ok: false, error: 'Producto inválido en la devolución.' };
    const remaining = saleItem.quantity - saleItem.returnedQuantity;
    if (retItem.quantity > remaining) {
      return {
        ok: false,
        error: `De "${saleItem.productName}" solo quedan ${remaining} unidades por devolver.`,
      };
    }
  }

  const now = new Date().toISOString();
  const items = draft.items.filter((i) => i.quantity > 0);
  const refundAmount = round2(items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0));

  const ret: SaleReturn = {
    id: generateId(),
    saleId: sale.id,
    saleNumber: sale.saleNumber,
    items,
    reason: draft.reason,
    refundMethod: draft.refundMethod,
    refundAmount: draft.refundMethod === 'none' || draft.refundMethod === 'exchange' ? 0 : refundAmount,
    userId: user.id,
    userName: user.name,
    date: now,
    notes: draft.notes,
  };
  salesStore.addReturn(ret);

  // Actualiza cantidades devueltas y estado de la venta.
  const updatedItems = sale.items.map((saleItem) => {
    const retItem = items.find((i) => i.saleItemId === saleItem.id);
    return retItem ? { ...saleItem, returnedQuantity: saleItem.returnedQuantity + retItem.quantity } : saleItem;
  });
  const fullyReturned = updatedItems.every((i) => i.returnedQuantity >= i.quantity);
  salesStore.updateSale(sale.id, {
    items: updatedItems,
    status: fullyReturned ? 'returned' : 'partially_returned',
  });

  // Repone stock si corresponde.
  const productStore = useProductStore.getState();
  const inventoryStore = useInventoryStore.getState();
  for (const retItem of items) {
    if (!retItem.restock) continue;
    const saleItem = sale.items.find((i) => i.id === retItem.saleItemId);
    const components =
      saleItem?.isCombo && saleItem.comboComponents
        ? saleItem.comboComponents.map((c) => ({ productId: c.productId, quantity: c.quantity * retItem.quantity }))
        : [{ productId: retItem.productId, quantity: retItem.quantity }];
    for (const comp of components) {
      const product = useProductStore.getState().products.find((p) => p.id === comp.productId);
      if (!product) continue;
      productStore.setStock(product.id, product.stock + comp.quantity);
      inventoryStore.addMovement({
        id: generateId(),
        productId: product.id,
        productName: product.name,
        type: 'return',
        quantity: comp.quantity,
        previousStock: product.stock,
        newStock: product.stock + comp.quantity,
        reason: `Devolución de venta ${sale.saleNumber}`,
        userId: user.id,
        userName: user.name,
        relatedSaleId: sale.id,
        relatedPurchaseId: null,
        date: now,
        notes: '',
      });
    }
  }

  // Salida de caja si se devuelve dinero en efectivo/transferencia.
  const register = getOpenRegister();
  if (register && (draft.refundMethod === 'cash' || draft.refundMethod === 'transfer') && ret.refundAmount > 0) {
    useCashStore.getState().addMovement({
      id: generateId(),
      cashRegisterId: register.id,
      type: 'refund',
      direction: 'out',
      amount: ret.refundAmount,
      method: draft.refundMethod === 'cash' ? 'cash' : 'transfer',
      reason: `Devolución de venta ${sale.saleNumber}`,
      userId: user.id,
      userName: user.name,
      relatedSaleId: sale.id,
      date: now,
      notes: draft.notes,
    });
  }

  // Crédito a favor del cliente.
  if (draft.refundMethod === 'credit_note' && sale.customerId && ret.refundAmount > 0) {
    useCustomerStore.getState().adjustDebt(sale.customerId, -ret.refundAmount);
  }

  logAudit({
    action: 'return_created',
    module: 'returns',
    description: `Devolución sobre la venta ${sale.saleNumber}`,
    severity: 'warning',
    metadata: { sale: sale.saleNumber, refund: ret.refundAmount, method: draft.refundMethod },
  });
  pushNotification({
    title: `Devolución registrada (${sale.saleNumber})`,
    description: `${items.length} producto(s) devueltos por ${user.name}.`,
    type: 'return_created',
    actionUrl: ROUTES.saleDetail(sale.id),
  });

  // En prod: persistir la devolución de forma atómica en Supabase (RPC create_return).
  if (isProdMode) {
    const itemReturnUpdates = items.map((ri) => {
      const si = sale.items.find((i) => i.id === ri.saleItemId);
      return { saleItemId: ri.saleItemId, returnedQuantity: (si?.returnedQuantity ?? 0) + ri.quantity };
    });
    const restockMap = new Map<string, number>();
    for (const ri of items) {
      if (!ri.restock) continue;
      const si = sale.items.find((i) => i.id === ri.saleItemId);
      const comps =
        si?.isCombo && si.comboComponents
          ? si.comboComponents.map((c) => ({ productId: c.productId, quantity: c.quantity * ri.quantity }))
          : [{ productId: ri.productId, quantity: ri.quantity }];
      for (const c of comps) restockMap.set(c.productId, (restockMap.get(c.productId) ?? 0) + c.quantity);
    }
    const restockDeltas = [...restockMap].map(([productId, qty]) => ({ productId, qty }));
    const cashMovement =
      register && (draft.refundMethod === 'cash' || draft.refundMethod === 'transfer') && ret.refundAmount > 0
        ? { cashRegisterId: register.id, method: draft.refundMethod === 'cash' ? 'cash' : 'transfer', amount: ret.refundAmount }
        : null;
    const customerCreditDelta =
      draft.refundMethod === 'credit_note' && sale.customerId && ret.refundAmount > 0 ? -ret.refundAmount : 0;
    const payload = {
      id: ret.id,
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      items: ret.items,
      reason: ret.reason,
      refundMethod: ret.refundMethod,
      refundAmount: ret.refundAmount,
      userId: ret.userId,
      userName: ret.userName,
      date: ret.date,
      notes: ret.notes,
      itemReturnUpdates,
      saleStatus: fullyReturned ? 'returned' : 'partially_returned',
      restockDeltas,
      cashMovement,
      customerCreditDelta,
      customerId: sale.customerId,
    };
    void createReturnSupabase(payload).catch(() =>
      toast.error('No se pudo sincronizar la devolución', 'Quedó local; reintentá.'),
    );
  }

  return { ok: true, ret };
}
