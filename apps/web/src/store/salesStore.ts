import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Sale, SaleReturn } from '@/types';
import { storageKey } from '@/services/storageService';

interface SalesState {
  sales: Sale[];
  returns: SaleReturn[];
  saleCounter: number;
  replaceAll: (data: Partial<Pick<SalesState, 'sales' | 'returns' | 'saleCounter'>>) => void;
  addSale: (sale: Sale) => void;
  updateSale: (id: string, patch: Partial<Sale>) => void;
  nextSaleCounter: () => number;
  addReturn: (ret: SaleReturn) => void;
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      sales: [],
      returns: [],
      saleCounter: 1,
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addSale: (sale) => set((s) => ({ sales: [sale, ...s.sales] })),
      updateSale: (id, patch) =>
        set((s) => ({ sales: s.sales.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      nextSaleCounter: () => {
        const n = get().saleCounter;
        set({ saleCounter: n + 1 });
        return n;
      },
      addReturn: (ret) => set((s) => ({ returns: [ret, ...s.returns] })),
    }),
    { name: storageKey('sales') },
  ),
);
