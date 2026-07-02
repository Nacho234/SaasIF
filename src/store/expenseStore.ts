import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Expense } from '@/types';
import { storageKey } from '@/services/storageService';

interface ExpenseState {
  expenses: Expense[];
  replaceAll: (data: Partial<Pick<ExpenseState, 'expenses'>>) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      expenses: [],
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addExpense: (expense) => set((s) => ({ expenses: [expense, ...s.expenses] })),
      updateExpense: (id, patch) =>
        set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    }),
    { name: storageKey('expenses') },
  ),
);
