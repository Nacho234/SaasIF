import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { storageKey } from '@/services/storageService';

interface UserState {
  users: User[];
  replaceAll: (data: Partial<Pick<UserState, 'users'>>) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      users: [],
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addUser: (user) => set((s) => ({ users: [...s.users, user] })),
      updateUser: (id, patch) =>
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
    }),
    { name: storageKey('users') },
  ),
);
