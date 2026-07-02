import { isWithinInterval, parseISO } from 'date-fns';
import type { CashClosure } from '@/types';
import { useCashStore } from '@/store/cashStore';
import { useSalesStore } from '@/store/salesStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { logAudit } from './auditService';
import { pushNotification } from './notificationService';

export interface StockSummary {
  unitsSold: number;
  productsSoldCount: number;
  inventoryMovementsCount: number;
}

/** Resumen de stock del turno: unidades vendidas, productos distintos y movimientos de inventario. */
export function getStockSummaryForRegister(registerId: string): StockSummary {
  const register = useCashStore.getState().registers.find((r) => r.id === registerId);
  const sales = useSalesStore.getState().sales.filter((s) => s.cashRegisterId === registerId && s.status !== 'cancelled');

  let unitsSold = 0;
  const products = new Set<string>();
  for (const sale of sales) {
    for (const item of sale.items) {
      unitsSold += item.quantity;
      products.add(item.productId);
    }
  }

  // Movimientos de inventario dentro de la ventana del turno.
  let inventoryMovementsCount = 0;
  if (register) {
    const from = parseISO(register.openedAt);
    const to = register.closedAt ? parseISO(register.closedAt) : new Date();
    inventoryMovementsCount = useInventoryStore
      .getState()
      .movements.filter((m) => {
        try {
          return isWithinInterval(parseISO(m.date), { start: from, end: to });
        } catch {
          return false;
        }
      }).length;
  }

  return { unitsSold, productsSoldCount: products.size, inventoryMovementsCount };
}

/** Cierres registrados para un turno, ordenados por versión descendente. */
export function getClosuresForRegister(registerId: string): CashClosure[] {
  return useCashStore
    .getState()
    .closures.filter((c) => c.cashRegisterId === registerId)
    .sort((a, b) => b.version - a.version);
}

/** Último cierre (versión más alta) de un turno. */
export function getLatestClosure(registerId: string): CashClosure | undefined {
  return getClosuresForRegister(registerId)[0];
}

/** Próxima versión de cierre para un turno (1 si nunca se cerró). */
export function nextClosureVersion(registerId: string): number {
  const latest = getLatestClosure(registerId);
  return latest ? latest.version + 1 : 1;
}

/**
 * Reapertura de una caja cerrada. Solo con permiso/config; conserva el cierre
 * original (no se borra) y deja la caja en estado 'reopened' para volver a operar.
 */
export function reopenRegister(input: { registerId: string; reason: string }): { ok: boolean; error?: string } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  const { settings } = useBusinessStore.getState();
  if (!settings.allowReopenCash) return { ok: false, error: 'La reapertura de cajas está deshabilitada en la configuración.' };
  if (settings.reopenOnlyAdmin && user.role !== 'admin') {
    return { ok: false, error: 'Solo un administrador puede reabrir una caja.' };
  }
  if (!input.reason.trim()) return { ok: false, error: 'El motivo de la reapertura es obligatorio.' };

  const store = useCashStore.getState();
  const register = store.registers.find((r) => r.id === input.registerId);
  if (!register) return { ok: false, error: 'Caja no encontrada.' };
  if (register.status === 'open' || register.status === 'reopened') {
    return { ok: false, error: 'La caja ya está abierta.' };
  }
  if (register.status === 'cancelled') return { ok: false, error: 'La caja está anulada.' };

  // Otra caja abierta bloquea la reapertura (una sola caja activa a la vez).
  const anotherOpen = store.registers.find(
    (r) => r.id !== register.id && (r.status === 'open' || r.status === 'reopened'),
  );
  if (anotherOpen) return { ok: false, error: `Ya hay otra caja abierta (${anotherOpen.number}). Cerrala primero.` };

  store.updateRegister(register.id, { status: 'reopened', closedAt: null, closedById: null, closedByName: null });
  logAudit({
    action: 'cash_reopened',
    module: 'cash',
    description: `Reabrió la caja ${register.number}`,
    severity: 'warning',
    metadata: { register: register.number, reason: input.reason.trim() },
  });
  pushNotification({
    title: `Caja ${register.number} reabierta`,
    description: `Reapertura por ${user.name}: ${input.reason.trim()}`,
    type: 'cash_closed',
  });
  return { ok: true };
}
