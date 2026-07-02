import type { PaymentMethodId } from './business';

export type ExpenseCategory =
  | 'rent'
  | 'services'
  | 'salaries'
  | 'suppliers'
  | 'cleaning'
  | 'maintenance'
  | 'advertising'
  | 'taxes'
  | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethodId;
  cashRegisterId: string | null;
  userId: string;
  userName: string;
  status: 'active' | 'void';
  notes: string;
}
