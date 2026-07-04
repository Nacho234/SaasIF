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
  /** Suscripción activa (candado). Default true: demo y estados sin dato no bloquean. */
  subscriptionActive: boolean;
  /** Estado crudo de la suscripción (trial/active/past_due/…) para mensajes. */
  subscriptionStatus: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: { user: User; token: string; businessId: string }) => void;
  setSubscription: (sub: { active: boolean; status: string | null }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      businessId: null,
      subscriptionActive: true,
      subscriptionStatus: null,
      setUser: (user) => set({ user }),
      setSession: ({ user, token, businessId }) => set({ user, token, businessId }),
      setSubscription: ({ active, status }) => set({ subscriptionActive: active, subscriptionStatus: status }),
      clearSession: () =>
        set({ user: null, token: null, businessId: null, subscriptionActive: true, subscriptionStatus: null }),
    }),
    { name: storageKey('auth') },
  ),
);
