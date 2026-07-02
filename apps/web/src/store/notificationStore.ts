import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppNotification } from '@/types';
import { storageKey } from '@/services/storageService';

interface NotificationState {
  notifications: AppNotification[];
  replaceAll: (data: Partial<Pick<NotificationState, 'notifications'>>) => void;
  addNotification: (notification: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addNotification: (notification) =>
        set((s) => ({ notifications: [notification, ...s.notifications].slice(0, 100) })),
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    }),
    { name: storageKey('notifications') },
  ),
);
