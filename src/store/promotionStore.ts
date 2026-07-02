import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Promotion } from '@/types';
import { storageKey } from '@/services/storageService';

interface PromotionState {
  promotions: Promotion[];
  replaceAll: (data: Partial<Pick<PromotionState, 'promotions'>>) => void;
  addPromotion: (promotion: Promotion) => void;
  updatePromotion: (id: string, patch: Partial<Promotion>) => void;
}

export const usePromotionStore = create<PromotionState>()(
  persist(
    (set) => ({
      promotions: [],
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addPromotion: (promotion) => set((s) => ({ promotions: [promotion, ...s.promotions] })),
      updatePromotion: (id, patch) =>
        set((s) => ({ promotions: s.promotions.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    }),
    { name: storageKey('promotions') },
  ),
);
