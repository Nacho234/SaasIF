import { endOfDay, format, isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PaymentMethodId, Sale } from '@/types';
import { useSalesStore } from '@/store/salesStore';
import { useProductStore } from '@/store/productStore';
import { useExpenseStore } from '@/store/expenseStore';
import { round2 } from '@/utils/calc';

export interface DateRange {
  from: Date;
  to: Date;
}

export type RangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'last30' | 'custom';

export function rangeFromPreset(preset: RangePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday':
      return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
    case 'week':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'month':
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    default:
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

export function salesInRange(range: DateRange, options?: { includeCancelled?: boolean }): Sale[] {
  return useSalesStore
    .getState()
    .sales.filter(
      (s) =>
        isWithinInterval(parseISO(s.date), { start: range.from, end: range.to }) &&
        (options?.includeCancelled || s.status !== 'cancelled'),
    );
}

export interface SalesMetrics {
  total: number;
  count: number;
  avgTicket: number;
  profit: number;
  marginPercent: number;
  byMethod: Partial<Record<PaymentMethodId, number>>;
  bySeller: { name: string; total: number; count: number }[];
  byCategory: { name: string; total: number }[];
  byProduct: { productId: string; name: string; quantity: number; total: number }[];
  byDay: { label: string; date: string; total: number; count: number }[];
}

export function getSalesMetrics(range: DateRange): SalesMetrics {
  const sales = salesInRange(range);
  const { products, categories } = useProductStore.getState();

  const byMethod: Partial<Record<PaymentMethodId, number>> = {};
  const bySellerMap = new Map<string, { name: string; total: number; count: number }>();
  const byCategoryMap = new Map<string, number>();
  const byProductMap = new Map<string, { productId: string; name: string; quantity: number; total: number }>();
  const byDayMap = new Map<string, { total: number; count: number }>();

  let total = 0;
  let profit = 0;

  for (const sale of sales) {
    total += sale.total;
    const saleGross = sale.items.reduce((a, i) => a + i.subtotal, 0);
    for (const payment of sale.payments) {
      const amount = payment.method === 'cash' ? round2(payment.amount - sale.change) : payment.amount;
      byMethod[payment.method] = round2((byMethod[payment.method] ?? 0) + Math.max(0, amount));
    }
    const seller = bySellerMap.get(sale.sellerId) ?? { name: sale.sellerName, total: 0, count: 0 };
    seller.total = round2(seller.total + sale.total);
    seller.count += 1;
    bySellerMap.set(sale.sellerId, seller);

    const dayKey = format(parseISO(sale.date), 'yyyy-MM-dd');
    const day = byDayMap.get(dayKey) ?? { total: 0, count: 0 };
    day.total = round2(day.total + sale.total);
    day.count += 1;
    byDayMap.set(dayKey, day);

    for (const item of sale.items) {
      // Ganancia proporcional al descuento general de la venta.
      const shareFactor = saleGross > 0 ? sale.total / saleGross : 1;
      profit += item.subtotal * shareFactor - item.costPrice * item.quantity;

      const product = products.find((p) => p.id === item.productId);
      const categoryName = product
        ? (categories.find((c) => c.id === product.categoryId)?.name ?? 'Sin categoría')
        : item.isCombo
          ? 'Combos'
          : 'Sin categoría';
      byCategoryMap.set(categoryName, round2((byCategoryMap.get(categoryName) ?? 0) + item.subtotal * shareFactor));

      const entry = byProductMap.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        quantity: 0,
        total: 0,
      };
      entry.quantity += item.quantity;
      entry.total = round2(entry.total + item.subtotal * shareFactor);
      byProductMap.set(item.productId, entry);
    }
  }

  const byDay = [...byDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      label: format(parseISO(date), 'dd MMM', { locale: es }),
      total: v.total,
      count: v.count,
    }));

  return {
    total: round2(total),
    count: sales.length,
    avgTicket: sales.length ? round2(total / sales.length) : 0,
    profit: round2(profit),
    marginPercent: total > 0 ? round2((profit / total) * 100) : 0,
    byMethod,
    bySeller: [...bySellerMap.values()].sort((a, b) => b.total - a.total),
    byCategory: [...byCategoryMap.entries()].map(([name, t]) => ({ name, total: t })).sort((a, b) => b.total - a.total),
    byProduct: [...byProductMap.values()].sort((a, b) => b.total - a.total),
    byDay,
  };
}

export function getExpensesInRange(range: DateRange) {
  return useExpenseStore
    .getState()
    .expenses.filter(
      (e) => e.status === 'active' && isWithinInterval(parseISO(e.date), { start: range.from, end: range.to }),
    );
}
