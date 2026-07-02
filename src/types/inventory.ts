export type InventoryMovementType =
  | 'initial'
  | 'manual_in'
  | 'manual_out'
  | 'sale'
  | 'return'
  | 'adjust_up'
  | 'adjust_down'
  | 'purchase'
  | 'sale_cancelled'
  | 'correction';

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: InventoryMovementType;
  /** Cantidad del movimiento (siempre positiva; la dirección la da el tipo). */
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string;
  userName: string;
  relatedSaleId: string | null;
  relatedPurchaseId: string | null;
  date: string;
  notes: string;
}
