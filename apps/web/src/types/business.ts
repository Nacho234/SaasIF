export type PaymentMethodId =
  | 'cash'
  | 'transfer'
  | 'debit_card'
  | 'credit_card'
  | 'mercado_pago'
  | 'customer_credit';

export type ThemeMode = 'light' | 'dark';

export interface BusinessSettings {
  businessName: string;
  /** Logo mock: data URL o null (se muestran iniciales). */
  logo: string | null;
  /** Rubro del comercio (petshop, kiosco, farmacia, etc.). */
  category: string;
  cuit: string;
  address: string;
  phone: string;
  email: string;
  currency: 'ARS' | 'USD';
  timezone: string;
  primaryColor: string;
  theme: ThemeMode;
  density: 'comfortable' | 'compact';
  enabledPaymentMethods: PaymentMethodId[];
  // Caja
  requireOpenCashToSell: boolean;
  allowSellerOpenCash: boolean;
  allowSellerCloseCash: boolean;
  requireNoteOnCashDifference: boolean;
  // Caja y cierre (arqueo, terminales, hoja de cierre)
  requireCashCount: boolean;
  allowCloseWithDifference: boolean;
  requireTerminalClosure: boolean;
  terminalClosureMode: 'simple' | 'advanced';
  requireEmployeeSignature: boolean;
  requireManagerSignature: boolean;
  allowReopenCash: boolean;
  reopenOnlyAdmin: boolean;
  autoGeneratePdf: boolean;
  showFiscalSummary: boolean;
  showStockSummary: boolean;
  // Ventas
  allowNegativeStock: boolean;
  allowDiscounts: boolean;
  maxDiscountPercent: number;
  allowCustomerCredit: boolean;
  // Stock
  defaultMinStock: number;
  lowStockAlerts: boolean;
  outOfStockAlerts: boolean;
  // Ticket
  receiptShowLogo: boolean;
  receiptShowCuit: boolean;
  receiptShowAddress: boolean;
  receiptShowQr: boolean;
  receiptMessage: string;
}
