import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, CustomerPayment } from '@/types';
import { storageKey } from '@/services/storageService';
import { round2 } from '@/utils/calc';

interface CustomerState {
  customers: Customer[];
  payments: CustomerPayment[];
  replaceAll: (data: Partial<Pick<CustomerState, 'customers' | 'payments'>>) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  adjustDebt: (id: string, delta: number) => void;
  addPayment: (payment: CustomerPayment) => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      customers: [],
      payments: [],
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addCustomer: (customer) => set((s) => ({ customers: [customer, ...s.customers] })),
      updateCustomer: (id, patch) =>
        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
          ),
        })),
      adjustDebt: (id, delta) =>
        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === id
              ? { ...c, debtBalance: round2(c.debtBalance + delta), updatedAt: new Date().toISOString() }
              : c,
          ),
        })),
      addPayment: (payment) => set((s) => ({ payments: [payment, ...s.payments] })),
    }),
    { name: storageKey('customers') },
  ),
);
