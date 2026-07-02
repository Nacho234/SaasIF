import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CashMovement, CashRegister } from '@/types';
import { storageKey } from '@/services/storageService';

interface CashState {
  registers: CashRegister[];
  movements: CashMovement[];
  registerCounter: number;
  replaceAll: (data: Partial<Pick<CashState, 'registers' | 'movements' | 'registerCounter'>>) => void;
  addRegister: (register: CashRegister) => void;
  updateRegister: (id: string, patch: Partial<CashRegister>) => void;
  nextRegisterCounter: () => number;
  addMovement: (movement: CashMovement) => void;
}

export const useCashStore = create<CashState>()(
  persist(
    (set, get) => ({
      registers: [],
      movements: [],
      registerCounter: 1,
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addRegister: (register) => set((s) => ({ registers: [register, ...s.registers] })),
      updateRegister: (id, patch) =>
        set((s) => ({ registers: s.registers.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      nextRegisterCounter: () => {
        const n = get().registerCounter;
        set({ registerCounter: n + 1 });
        return n;
      },
      addMovement: (movement) => set((s) => ({ movements: [movement, ...s.movements] })),
    }),
    { name: storageKey('cash') },
  ),
);

/** Caja abierta actual (o undefined). */
export function selectOpenRegister(state: Pick<CashState, 'registers'>): CashRegister | undefined {
  return state.registers.find((r) => r.status === 'open');
}
