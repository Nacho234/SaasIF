export type PromotionType =
  | 'percentage'
  | 'fixed_amount'
  | 'two_for_one'
  | 'category_discount'
  | 'brand_discount'
  | 'product_discount';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  /** Porcentaje (0-100) o monto fijo en $, según el tipo. */
  value: number;
  startDate: string;
  endDate: string;
  productIds: string[];
  categoryIds: string[];
  brandIds: string[];
  isActive: boolean;
  conditions: string;
  usedCount: number;
  createdAt: string;
}
