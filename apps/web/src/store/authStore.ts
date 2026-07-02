import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { storageKey } from '@/services/storageService';

interface AuthState {
  user: User | null;
  /** JWT del backend (solo en modo prod). En demo queda null. */
  token: string | null;
  /** Id del negocio en el backend (solo prod). */
  businessId: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: { user: User; token: string; businessId: string }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      businessId: null,
      setUser: (user) => set({ user }),
      setSession: ({ user, token, businessId }) => set({ user, token, businessId }),
      clearSession: () => set({ user: null, token: null, businessId: null }),
    }),
    { name: storageKey('auth') },
  ),
);
