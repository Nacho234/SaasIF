import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Brand, Category, Combo, Product } from '@/types';
import { storageKey } from '@/services/storageService';

interface ProductState {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  combos: Combo[];
  replaceAll: (data: Partial<Pick<ProductState, 'products' | 'categories' | 'brands' | 'combos'>>) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  setStock: (id: string, newStock: number) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  addBrand: (brand: Brand) => void;
  updateBrand: (id: string, patch: Partial<Brand>) => void;
  addCombo: (combo: Combo) => void;
  updateCombo: (id: string, patch: Partial<Combo>) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      products: [],
      categories: [],
      brands: [],
      combos: [],
      replaceAll: (data) => set((s) => ({ ...s, ...data })),
      addProduct: (product) => set((s) => ({ products: [product, ...s.products] })),
      updateProduct: (id, patch) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
          ),
        })),
      setStock: (id, newStock) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, stock: newStock, updatedAt: new Date().toISOString() } : p,
          ),
        })),
      addCategory: (category) => set((s) => ({ categories: [...s.categories, category] })),
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      addBrand: (brand) => set((s) => ({ brands: [...s.brands, brand] })),
      updateBrand: (id, patch) =>
        set((s) => ({ brands: s.brands.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      addCombo: (combo) => set((s) => ({ combos: [combo, ...s.combos] })),
      updateCombo: (id, patch) =>
        set((s) => ({ combos: s.combos.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    }),
    { name: storageKey('catalog') },
  ),
);
