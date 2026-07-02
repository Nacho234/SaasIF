import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BusinessSettings } from '@/types';
import { storageKey } from '@/services/storageService';

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'Mi Local',
  logo: null,
  category: 'Petshop',
  cuit: '',
  address: '',
  phone: '',
  email: '',
  currency: 'ARS',
  timezone: 'America/Argentina/Buenos_Aires',
  primaryColor: '#2563eb',
  theme: 'light',
  density: 'comfortable',
  enabledPaymentMethods: ['cash', 'transfer', 'debit_card', 'credit_card', 'mercado_pago', 'customer_credit'],
  requireOpenCashToSell: true,
  allowSellerOpenCash: false,
  allowSellerCloseCash: false,
  requireNoteOnCashDifference: true,
  requireCashCount: true,
  allowCloseWithDifference: true,
  requireTerminalClosure: false,
  terminalClosureMode: 'simple',
  requireEmployeeSignature: false,
  requireManagerSignature: false,
  allowReopenCash: true,
  reopenOnlyAdmin: true,
  autoGeneratePdf: true,
  showFiscalSummary: true,
  showStockSummary: true,
  allowNegativeStock: false,
  allowDiscounts: true,
  maxDiscountPercent: 20,
  allowCustomerCredit: true,
  defaultMinStock: 5,
  lowStockAlerts: true,
  outOfStockAlerts: true,
  receiptShowLogo: true,
  receiptShowCuit: true,
  receiptShowAddress: true,
  receiptShowQr: true,
  receiptMessage: '¡Gracias por tu compra! Te esperamos pronto.',
};

interface BusinessState {
  settings: BusinessSettings;
  onboardingCompleted: boolean;
  demoSeeded: boolean;
  updateSettings: (patch: Partial<BusinessSettings>) => void;
  completeOnboarding: () => void;
  setDemoSeeded: (seeded: boolean) => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      onboardingCompleted: false,
      demoSeeded: false,
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      setDemoSeeded: (seeded) => set({ demoSeeded: seeded }),
    }),
    {
      name: storageKey('business'),
      // Completa con los defaults las claves nuevas que no estén en el estado persistido
      // (p. ej. flags de cierre agregados en una versión posterior).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BusinessState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
        };
      },
    },
  ),
);
