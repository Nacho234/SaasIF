import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Purchase, Supplier } from '@/types';
import { storageKey } from '@/services/storageService';

interface SupplierState {
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseCounter: number;
  replaceAll: (data: Partial<Pick<SupplierState, 'suppliers' | 'purchases' | 'purchaseCounter'>>) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  addPurchase: (purchase: Purchase) => void;
  updatePurchase: (id: string, patch: Partial<Purchase>) => void;
  nextPurchaseCounter: () => number;
}

export const useSupplierStore = create<SupplierState>()(
  persist(
    (set, get) => ({
      suppliers: [],
      purchases: [],
      purchaseCounter: 1,
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addSupplier: (supplier) => set((s) => ({ suppliers: [supplier, ...s.suppliers] })),
      updateSupplier: (id, patch) =>
        set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      addPurchase: (purchase) => set((s) => ({ purchases: [purchase, ...s.purchases] })),
      updatePurchase: (id, patch) =>
        set((s) => ({ purchases: s.purchases.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      nextPurchaseCounter: () => {
        const n = get().purchaseCounter;
        set({ purchaseCounter: n + 1 });
        return n;
      },
    }),
    { name: storageKey('suppliers') },
  ),
);
