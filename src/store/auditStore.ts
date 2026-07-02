import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuditLog } from '@/types';
import { storageKey } from '@/services/storageService';

interface AuditState {
  logs: AuditLog[];
  replaceAll: (data: Partial<Pick<AuditState, 'logs'>>) => void;
  addLog: (log: AuditLog) => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      logs: [],
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addLog: (log) => set((s) => ({ logs: [log, ...s.logs].slice(0, 500) })),
    }),
    { name: storageKey('audit') },
  ),
);
