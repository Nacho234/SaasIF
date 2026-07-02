import type { Brand, Category, Product } from '@/types';
import { isProdMode } from '@/config/appMode';
import { useProductStore } from '@/store/productStore';
import { generateId } from '@/utils/id';
import { logAudit } from './auditService';
import { brandsApi, categoriesApi, productsApi } from './api/productsApiService';

/**
 * Facade del catálogo: en modo prod habla con el backend (y refleja el resultado en el
 * store, que oficia de caché reactiva); en modo demo opera sobre el store local.
 * Las pantallas llaman a estas funciones y no les importa el modo.
 */

export interface ProductInput {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  categoryId: string;
  brandId: string | null;
  supplierId: string | null;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  isFavorite: boolean;
  notes: string;
}

/** Carga el catálogo del backend al store (solo prod). En demo no hace nada (ya está sembrado). */
export async function loadCatalog(): Promise<void> {
  if (!isProdMode) return;
  const [products, categories, brands] = await Promise.all([
    productsApi.list(),
    categoriesApi.list(),
    brandsApi.list(),
  ]);
  useProductStore.getState().replaceAll({ products, categories, brands, combos: [] });
}

export async function createProduct(input: ProductInput): Promise<Product> {
  if (isProdMode) {
    const product = await productsApi.create({
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      description: input.description,
      categoryId: input.categoryId || null,
      brandId: input.brandId,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      stock: input.stock,
      minStock: input.minStock,
      isFavorite: input.isFavorite,
      notes: input.notes,
    });
    useProductStore.getState().addProduct(product);
    return product;
  }
  const now = new Date().toISOString();
  const product: Product = {
    id: generateId(),
    ...input,
    image: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  useProductStore.getState().addProduct(product);
  logAudit({ action: 'product_created', module: 'products', description: `Creó el producto "${product.name}"`, severity: 'success' });
  return product;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  if (isProdMode) {
    await productsApi.update(id, {
      name: patch.name,
      sku: patch.sku,
      barcode: patch.barcode,
      description: patch.description,
      categoryId: patch.categoryId,
      brandId: patch.brandId,
      costPrice: patch.costPrice,
      salePrice: patch.salePrice,
      minStock: patch.minStock,
      isActive: patch.isActive,
      isFavorite: patch.isFavorite,
      notes: patch.notes,
    });
  }
  useProductStore.getState().updateProduct(id, patch);
}

export async function createCategory(input: { name: string; description: string; color: string }): Promise<Category> {
  if (isProdMode) {
    const category = await categoriesApi.create(input);
    useProductStore.getState().addCategory(category);
    return category;
  }
  const category: Category = { id: generateId(), ...input, isActive: true };
  useProductStore.getState().addCategory(category);
  return category;
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<void> {
  if (isProdMode) {
    await categoriesApi.update(id, patch);
  }
  useProductStore.getState().updateCategory(id, patch);
}

export async function createBrand(input: { name: string; description: string }): Promise<Brand> {
  if (isProdMode) {
    const brand = await brandsApi.create(input);
    useProductStore.getState().addBrand(brand);
    return brand;
  }
  const brand: Brand = { id: generateId(), ...input, isActive: true };
  useProductStore.getState().addBrand(brand);
  return brand;
}

export async function updateBrand(id: string, patch: Partial<Brand>): Promise<void> {
  if (isProdMode) {
    await brandsApi.update(id, patch);
  }
  useProductStore.getState().updateBrand(id, patch);
}
