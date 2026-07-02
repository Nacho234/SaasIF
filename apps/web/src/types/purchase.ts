export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  cuit: string;
  address: string;
  contactName: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

export type PurchaseStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  /** Número legible: OC-0001. */
  number: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  total: number;
  status: PurchaseStatus;
  notes: string;
  createdById: string;
  createdByName: string;
  receivedAt: string | null;
}
