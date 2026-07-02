import { create } from 'zustand';
import { generateId } from '@/utils/id';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface UiState {
  toasts: ToastItem[];
  confirm: (ConfirmOptions & { open: boolean }) | null;
  globalSearchOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  showToast: (title: string, options?: { description?: string; variant?: ToastVariant }) => void;
  dismissToast: (id: string) => void;
  askConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
  setGlobalSearchOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  confirm: null,
  globalSearchOpen: false,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  showToast: (title, options) => {
    const id = generateId();
    set((s) => ({
      toasts: [...s.toasts.slice(-3), { id, title, description: options?.description, variant: options?.variant ?? 'success' }],
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  askConfirm: (options) => set({ confirm: { ...options, open: true } }),
  closeConfirm: () => set({ confirm: null }),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));

/** Helpers para usar fuera de componentes React (servicios). */
export const toast = {
  success: (title: string, description?: string) =>
    useUiStore.getState().showToast(title, { description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useUiStore.getState().showToast(title, { description, variant: 'error' }),
  warning: (title: string, description?: string) =>
    useUiStore.getState().showToast(title, { description, variant: 'warning' }),
  info: (title: string, description?: string) =>
    useUiStore.getState().showToast(title, { description, variant: 'info' }),
};
