import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CashClosure, CashMovement, CashRegister, TerminalClosure } from '@/types';
import { storageKey } from '@/services/storageService';

interface CashState {
  registers: CashRegister[];
  movements: CashMovement[];
  closures: CashClosure[];
  terminalClosures: TerminalClosure[];
  registerCounter: number;
  replaceAll: (
    data: Partial<
      Pick<CashState, 'registers' | 'movements' | 'closures' | 'terminalClosures' | 'registerCounter'>
    >,
  ) => void;
  addRegister: (register: CashRegister) => void;
  updateRegister: (id: string, patch: Partial<CashRegister>) => void;
  nextRegisterCounter: () => number;
  addMovement: (movement: CashMovement) => void;
  addClosure: (closure: CashClosure) => void;
  addTerminalClosure: (terminal: TerminalClosure) => void;
  removeTerminalClosure: (id: string) => void;
}

export const useCashStore = create<CashState>()(
  persist(
    (set, get) => ({
      registers: [],
      movements: [],
      closures: [],
      terminalClosures: [],
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
      addClosure: (closure) => set((s) => ({ closures: [closure, ...s.closures] })),
      addTerminalClosure: (terminal) => set((s) => ({ terminalClosures: [terminal, ...s.terminalClosures] })),
      removeTerminalClosure: (id) =>
        set((s) => ({ terminalClosures: s.terminalClosures.filter((t) => t.id !== id) })),
    }),
    { name: storageKey('cash') },
  ),
);

/** Caja activa actual: abierta o reabierta (o undefined). */
export function selectOpenRegister(state: Pick<CashState, 'registers'>): CashRegister | undefined {
  return state.registers.find((r) => r.status === 'open' || r.status === 'reopened');
}
