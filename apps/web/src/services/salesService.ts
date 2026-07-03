import type { Combo, PaymentMethodId, Product, Sale, SaleItem } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useProductStore } from '@/store/productStore';
import { useSalesStore } from '@/store/salesStore';
import { useCashStore } from '@/store/cashStore';
import { useCustomerStore } from '@/store/customerStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { calcCartTotals, round2 } from '@/utils/calc';
import { generateId, generateSaleNumber } from '@/utils/id';
import { logAudit } from './auditService';
import { checkStockAlerts, pushNotification } from './notificationService';
import { getOpenRegister } from './cashRegisterService';
import { ROUTES } from '@/constants/routes';
import { isProdMode } from '@/config/appMode';
import { createSaleSupabase } from './supabase/supabaseSalesService';
import { toast } from '@/store/uiStore';

export interface CartLine {
  lineId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  /** Descuento en $ sobre la línea completa. */
  discount: number;
  isCombo: boolean;
  comboId: string | null;
}

export interface DraftPayment {
  method: PaymentMethodId;
  amount: number;
  reference?: string;
  cardLast4?: string;
  installments?: number;
}

export interface SaleDraft {
  items: CartLine[];
  customerId: string | null;
  discountPercent: number;
  discountAmount: number;
  surcharge: number;
  payments: DraftPayment[];
  cashReceived: number | null;
  notes: string;
  promotionId: string | null;
}

/** Stock vendible de un combo según sus componentes. */
export function comboAvailableStock(combo: Combo, products: Product[]): number {
  let available = Infinity;
  for (const item of combo.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return 0;
    available = Math.min(available, Math.floor(product.stock / item.quantity));
  }
  return available === Infinity ? 0 : Math.max(0, available);
}

/** Valida el borrador completo. Devuelve mensaje de error o null si está OK. */
export function validateSaleDraft(draft: SaleDraft): string | null {
  const { settings } = useBusinessStore.getState();
  const { products, combos } = useProductStore.getState();
  const user = useAuthStore.getState().user;

  if (!user) return 'No hay sesión activa.';
  if (!user.permissions.includes('sell')) return 'Este usuario no tiene permiso para vender.';
  if (settings.requireOpenCashToSell && !getOpenRegister()) {
    return 'Primero tenés que abrir la caja para vender.';
  }
  if (draft.items.length === 0) return 'El carrito está vacío.';

  for (const line of draft.items) {
    if (line.quantity <= 0) return 'La cantidad debe ser mayor a cero.';
    if (!settings.allowNegativeStock) {
      if (line.isCombo && line.comboId) {
        const combo = combos.find((c) => c.id === line.comboId);
        if (!combo) return 'El combo ya no existe.';
        if (comboAvailableStock(combo, products) < line.quantity) {
          return `No hay stock suficiente para el combo "${line.name}".`;
        }
      } else {
        const product = products.find((p) => p.id === line.productId);
        if (!product) return `El producto "${line.name}" ya no existe.`;
        if (product.stock < line.quantity) {
          return `No hay stock suficiente de "${line.name}" (disponible: ${product.stock}).`;
        }
      }
    }
  }

  const totals = calcCartTotals(draft);
  if (totals.total < 0) return 'El total no puede ser negativo.';
  if (totals.discountTotal > totals.subtotal) return 'El descuento no puede superar el total.';

  const hasDiscount = totals.discountTotal > 0;
  if (hasDiscount) {
    if (!settings.allowDiscounts) return 'Los descuentos están deshabilitados en la configuración.';
    if (!user.permissions.includes('create_discount')) {
      return 'Este usuario no tiene permiso para aplicar descuentos.';
    }
    const percentApplied = totals.subtotal > 0 ? (totals.discountTotal / totals.subtotal) * 100 : 0;
    if (percentApplied > settings.maxDiscountPercent + 0.01) {
      return `El descuento supera el máximo permitido (${settings.maxDiscountPercent}%).`;
    }
  }

  if (draft.payments.length === 0) return 'Seleccioná un método de pago.';
  const credit = draft.payments.find((p) => p.method === 'customer_credit');
  if (credit) {
    if (!settings.allowCustomerCredit) return 'La cuenta corriente está deshabilitada.';
    if (!draft.customerId) return 'Para vender a cuenta corriente tenés que seleccionar un cliente.';
  }

  const paid = round2(draft.payments.reduce((acc, p) => acc + p.amount, 0));
  if (draft.payments.some((p) => p.amount <= 0)) return 'Cada pago debe ser mayor a cero.';
  if (paid < totals.total) {
    return `El pago no cubre el total (faltan $${round2(totals.total - paid).toLocaleString('es-AR')}).`;
  }
  if (paid > totals.total) {
    // Solo se admite excedente si es efectivo (vuelto).
    const nonCash = draft.payments.filter((p) => p.method !== 'cash');
    const nonCashTotal = round2(nonCash.reduce((acc, p) => acc + p.amount, 0));
    if (nonCashTotal > totals.total) return 'El pago mixto no coincide con el total.';
  }
  return null;
}

function buildSaleItems(draft: SaleDraft): SaleItem[] {
  const { combos } = useProductStore.getState();
  return draft.items.map((line) => {
    const combo = line.isCombo && line.comboId ? combos.find((c) => c.id === line.comboId) : null;
    const { products } = useProductStore.getState();
    return {
      id: generateId(),
      productId: line.productId,
      productName: line.name,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      costPrice: line.costPrice,
      discount: line.discount,
      subtotal: round2(line.quantity * line.unitPrice - line.discount),
      isCombo: line.isCombo,
      comboId: line.comboId,
      comboComponents: combo
        ? combo.items.map((ci) => ({
            productId: ci.productId,
            productName: products.find((p) => p.id === ci.productId)?.name ?? 'Producto',
            quantity: ci.quantity,
          }))
        : null,
      returnedQuantity: 0,
    };
  });
}

/** Descuenta stock y registra movimientos de inventario por cada producto afectado. */
function applyStockForSale(sale: Sale, direction: 'out' | 'in', reason: string, type: 'sale' | 'sale_cancelled') {
  const productStore = useProductStore.getState();
  const inventoryStore = useInventoryStore.getState();
  const user = useAuthStore.getState().user;

  // Consolida cantidades por producto (los combos se expanden a componentes).
  const deltas = new Map<string, number>();
  for (const item of sale.items) {
    if (item.isCombo && item.comboComponents) {
      for (const comp of item.comboComponents) {
        deltas.set(comp.productId, (deltas.get(comp.productId) ?? 0) + comp.quantity * item.quantity);
      }
    } else {
      deltas.set(item.productId, (deltas.get(item.productId) ?? 0) + item.quantity);
    }
  }

  for (const [productId, qty] of deltas) {
    const product = useProductStore.getState().products.find((p) => p.id === productId);
    if (!product) continue;
    const previous = product.stock;
    const next = direction === 'out' ? previous - qty : previous + qty;
    productStore.setStock(productId, next);
    inventoryStore.addMovement({
      id: generateId(),
      productId,
      productName: product.name,
      type,
      quantity: qty,
      previousStock: previous,
      newStock: next,
      reason,
      userId: user?.id ?? 'system',
      userName: user?.name ?? 'Sistema',
      relatedSaleId: sale.id,
      relatedPurchaseId: null,
      date: new Date().toISOString(),
      notes: '',
    });
    if (direction === 'out') checkStockAlerts({ ...product, stock: next });
  }
}

export function confirmSale(draft: SaleDraft): { ok: boolean; error?: string; sale?: Sale } {
  const error = validateSaleDraft(draft);
  if (error) return { ok: false, error };

  const user = useAuthStore.getState().user!;
  const register = getOpenRegister();
  const { customers } = useCustomerStore.getState();
  const customer = draft.customerId ? customers.find((c) => c.id === draft.customerId) : null;
  const totals = calcCartTotals(draft);
  const salesStore = useSalesStore.getState();
  const now = new Date().toISOString();

  const paid = round2(draft.payments.reduce((acc, p) => acc + p.amount, 0));
  const change = round2(Math.max(0, paid - totals.total));
  const creditAmount = round2(
    draft.payments.filter((p) => p.method === 'customer_credit').reduce((acc, p) => acc + p.amount, 0),
  );

  const sale: Sale = {
    id: generateId(),
    saleNumber: generateSaleNumber(salesStore.nextSaleCounter()),
    date: now,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? null,
    sellerId: user.id,
    sellerName: user.name,
    cashRegisterId: register?.id ?? '',
    items: buildSaleItems(draft),
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    surchargeTotal: totals.surchargeTotal,
    total: totals.total,
    payments: draft.payments.map((p) => ({
      id: generateId(),
      method: p.method,
      amount: round2(p.amount),
      reference: p.reference ?? '',
      cardLast4: p.cardLast4 ?? '',
      installments: p.installments ?? 1,
      status: p.method === 'customer_credit' ? 'pending' : 'approved',
    })),
    cashReceived: draft.cashReceived,
    change,
    status: creditAmount > 0 ? 'pending' : 'paid',
    notes: draft.notes,
    promotionId: draft.promotionId,
    createdAt: now,
    cancelledAt: null,
    cancelReason: '',
  };

  salesStore.addSale(sale);
  applyStockForSale(sale, 'out', `Venta ${sale.saleNumber}`, 'sale');

  // Movimientos de caja: uno por método de pago (efectivo neto de vuelto).
  const cashMovementsForRpc: { id: string; cashRegisterId: string; method: PaymentMethodId; amount: number }[] = [];
  if (register) {
    const cashStore = useCashStore.getState();
    for (const payment of sale.payments) {
      if (payment.method === 'customer_credit') continue;
      const amount = payment.method === 'cash' ? round2(payment.amount - change) : payment.amount;
      if (amount <= 0) continue;
      const movementId = generateId();
      cashStore.addMovement({
        id: movementId,
        cashRegisterId: register.id,
        type: 'sale',
        direction: 'in',
        amount,
        method: payment.method,
        reason: `Venta ${sale.saleNumber}`,
        userId: user.id,
        userName: user.name,
        relatedSaleId: sale.id,
        date: now,
        notes: '',
      });
      cashMovementsForRpc.push({ id: movementId, cashRegisterId: register.id, method: payment.method, amount });
    }
  }

  // Cuenta corriente: registra deuda del cliente.
  if (creditAmount > 0 && customer) {
    useCustomerStore.getState().adjustDebt(customer.id, creditAmount);
    pushNotification({
      title: `Deuda registrada: ${customer.name}`,
      description: `Venta ${sale.saleNumber} a cuenta corriente.`,
      type: 'pending_debt',
      actionUrl: ROUTES.customerDetail(customer.id),
    });
  }

  // En prod: persistir la venta de forma atómica en Supabase (RPC create_sale).
  if (isProdMode) {
    const stockMap = new Map<string, number>();
    for (const item of sale.items) {
      if (item.isCombo && item.comboComponents) {
        for (const comp of item.comboComponents) {
          stockMap.set(comp.productId, (stockMap.get(comp.productId) ?? 0) + comp.quantity * item.quantity);
        }
      } else {
        stockMap.set(item.productId, (stockMap.get(item.productId) ?? 0) + item.quantity);
      }
    }
    const stockDeltas = [...stockMap].map(([productId, qty]) => ({ productId, qty }));
    const payload = {
      id: sale.id,
      saleNumber: sale.saleNumber,
      date: sale.date,
      customerId: sale.customerId,
      customerName: sale.customerName,
      sellerId: sale.sellerId,
      sellerName: sale.sellerName,
      cashRegisterId: sale.cashRegisterId || null,
      subtotal: sale.subtotal,
      discountTotal: sale.discountTotal,
      surchargeTotal: sale.surchargeTotal,
      total: sale.total,
      payments: sale.payments,
      cashReceived: sale.cashReceived,
      change: sale.change,
      notes: sale.notes,
      promotionId: sale.promotionId,
      items: sale.items,
      stockDeltas,
      cashMovements: cashMovementsForRpc,
      customerDebtDelta: creditAmount,
    };
    void createSaleSupabase(payload).catch(() =>
      toast.error('No se pudo sincronizar la venta', 'Se registró localmente pero falló guardarla en el servidor.'),
    );
  }

  logAudit({
    action: 'sale_created',
    module: 'sales',
    description: `Venta ${sale.saleNumber} confirmada`,
    severity: 'success',
    metadata: { sale: sale.saleNumber, total: sale.total, items: sale.items.length },
  });
  return { ok: true, sale };
}

export function cancelSale(saleId: string, reason: string): { ok: boolean; error?: string } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  if (!user.permissions.includes('cancel_sale')) {
    return { ok: false, error: 'Este usuario no tiene permiso para anular ventas.' };
  }
  if (!reason.trim()) return { ok: false, error: 'El motivo de anulación es obligatorio.' };

  const salesStore = useSalesStore.getState();
  const sale = salesStore.sales.find((s) => s.id === saleId);
  if (!sale) return { ok: false, error: 'Venta no encontrada.' };
  if (sale.status === 'cancelled') return { ok: false, error: 'La venta ya está anulada.' };

  const now = new Date().toISOString();
  salesStore.updateSale(saleId, { status: 'cancelled', cancelledAt: now, cancelReason: reason.trim() });
  applyStockForSale(sale, 'in', `Anulación de venta ${sale.saleNumber}`, 'sale_cancelled');

  // Si la caja de la venta sigue abierta, registra la salida del dinero.
  const register = getOpenRegister();
  if (register && register.id === sale.cashRegisterId) {
    const cashStore = useCashStore.getState();
    for (const payment of sale.payments) {
      if (payment.method === 'customer_credit') continue;
      const amount = payment.method === 'cash' ? round2(payment.amount - sale.change) : payment.amount;
      if (amount <= 0) continue;
      cashStore.addMovement({
        id: generateId(),
        cashRegisterId: register.id,
        type: 'cancellation',
        direction: 'out',
        amount,
        method: payment.method,
        reason: `Anulación de venta ${sale.saleNumber}`,
        userId: user.id,
        userName: user.name,
        relatedSaleId: sale.id,
        date: now,
        notes: reason.trim(),
      });
    }
  }

  // Revierte deuda de cuenta corriente si la hubo.
  const creditAmount = round2(
    sale.payments.filter((p) => p.method === 'customer_credit').reduce((acc, p) => acc + p.amount, 0),
  );
  if (creditAmount > 0 && sale.customerId) {
    useCustomerStore.getState().adjustDebt(sale.customerId, -creditAmount);
  }

  logAudit({
    action: 'sale_cancelled',
    module: 'sales',
    description: `Anuló la venta ${sale.saleNumber}`,
    severity: 'warning',
    metadata: { sale: sale.saleNumber, total: sale.total, reason: reason.trim() },
  });
  pushNotification({
    title: `Venta ${sale.saleNumber} anulada`,
    description: `Anulada por ${user.name}. El stock fue repuesto.`,
    type: 'sale_cancelled',
    actionUrl: ROUTES.saleDetail(sale.id),
  });
  return { ok: true };
}
