export interface Category {
  id: string;
  name: string;
  description: string;
  /** Color de acento para chips y POS (hex). */
  color: string;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  brandId: string | null;
  supplierId: string | null;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  /** Imagen mock: emoji NO — usamos un icono lucide por categoría + color. Acepta data URL si se carga. */
  image: string | null;
  isActive: boolean;
  isFavorite: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComboItem {
  productId: string;
  quantity: number;
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  items: ComboItem[];
  comboPrice: number;
  isActive: boolean;
  createdAt: string;
}
