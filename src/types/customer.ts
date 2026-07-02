import type { PaymentMethodId } from './business';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  cuit: string;
  address: string;
  birthDate: string | null;
  notes: string;
  tags: string[];
  isActive: boolean;
  /** Deuda actual de cuenta corriente (>= 0). */
  debtBalance: number;
  createdAt: string;
  updatedAt: string;
}

/** Pago de deuda de cuenta corriente. */
export interface CustomerPayment {
  id: string;
  customerId: string;
  amount: number;
  method: PaymentMethodId;
  date: string;
  userId: string;
  userName: string;
  notes: string;
}
