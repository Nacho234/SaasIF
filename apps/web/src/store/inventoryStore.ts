import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InventoryMovement } from '@/types';
import { storageKey } from '@/services/storageService';

interface InventoryState {
  movements: InventoryMovement[];
  replaceAll: (data: Partial<Pick<InventoryState, 'movements'>>) => void;
  addMovement: (movement: InventoryMovement) => void;
  addMovements: (movements: InventoryMovement[]) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      movements: [],
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addMovement: (movement) => set((s) => ({ movements: [movement, ...s.movements] })),
      addMovements: (movements) => set((s) => ({ movements: [...movements, ...s.movements] })),
    }),
    { name: storageKey('inventory') },
  ),
);
