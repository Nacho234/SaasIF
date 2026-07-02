import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { storageKey } from '@/services/storageService';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: storageKey('auth') },
  ),
);
