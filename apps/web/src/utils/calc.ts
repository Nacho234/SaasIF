import type { SaleItem } from '@/types';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CartTotalsInput {
  items: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount'>[];
  /** Descuento general: porcentaje 0-100. */
  discountPercent: number;
  /** Descuento general: monto fijo en $. */
  discountAmount: number;
  /** Recargo en $. */
  surcharge: number;
}

export interface CartTotals {
  subtotal: number;
  itemDiscounts: number;
  generalDiscount: number;
  discountTotal: number;
  surchargeTotal: number;
  total: number;
}

export function calcCartTotals(input: CartTotalsInput): CartTotals {
  const gross = input.items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  const itemDiscounts = input.items.reduce((acc, it) => acc + it.discount, 0);
  const subtotal = round2(gross);
  const base = Math.max(0, gross - itemDiscounts);
  const generalDiscount = round2(
    Math.min(base, base * (input.discountPercent / 100) + input.discountAmount),
  );
  const discountTotal = round2(itemDiscounts + generalDiscount);
  const surchargeTotal = round2(Math.max(0, input.surcharge));
  const total = round2(Math.max(0, subtotal - discountTotal + surchargeTotal));
  return { subtotal, itemDiscounts, generalDiscount, discountTotal, surchargeTotal, total };
}

export function calcMarginPercent(costPrice: number, salePrice: number): number {
  if (salePrice <= 0) return 0;
  return round2(((salePrice - costPrice) / salePrice) * 100);
}
