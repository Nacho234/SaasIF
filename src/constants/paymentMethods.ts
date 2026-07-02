import type { PaymentMethodId } from '@/types';
import { Banknote, Landmark, CreditCard, QrCode, BookUser, type LucideIcon } from 'lucide-react';

export interface PaymentMethodDef {
  id: PaymentMethodId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { id: 'cash', label: 'Efectivo', shortLabel: 'Efectivo', icon: Banknote },
  { id: 'transfer', label: 'Transferencia', shortLabel: 'Transf.', icon: Landmark },
  { id: 'debit_card', label: 'Tarjeta de débito', shortLabel: 'Débito', icon: CreditCard },
  { id: 'credit_card', label: 'Tarjeta de crédito', shortLabel: 'Crédito', icon: CreditCard },
  { id: 'mercado_pago', label: 'Mercado Pago', shortLabel: 'MP', icon: QrCode },
  { id: 'customer_credit', label: 'Cuenta corriente', shortLabel: 'Cta. cte.', icon: BookUser },
];

export const PAYMENT_METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.id, m.label]),
) as Record<PaymentMethodId, string>;

export function paymentMethodDef(id: PaymentMethodId): PaymentMethodDef {
  return PAYMENT_METHODS.find((m) => m.id === id) ?? PAYMENT_METHODS[0];
}
