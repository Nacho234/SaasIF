import type { Brand, Category, Product } from '@/types';
import { apiFetch } from './apiClient';

// --- Formas que devuelve el backend ---
interface ApiProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  isActive: boolean;
  isFavorite: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
interface ApiCategory {
  id: string; name: string; description: string; color: string; isActive: boolean;
}
interface ApiBrand {
  id: string; name: string; description: string; isActive: boolean;
}

// --- Mappers backend -> frontend ---
function toProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    description: p.description,
    categoryId: p.categoryId ?? '',
    brandId: p.brandId,
    supplierId: null, // proveedores: dominio futuro
    costPrice: p.costPrice,
    salePrice: p.salePrice,
    stock: p.stock,
    minStock: p.minStock,
    image: p.imageUrl,
    isActive: p.isActive,
    isFavorite: p.isFavorite,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
function toCategory(c: ApiCategory): Category {
  return { id: c.id, name: c.name, description: c.description, color: c.color, isActive: c.isActive };
}
function toBrand(b: ApiBrand): Brand {
  return { id: b.id, name: b.name, description: b.description, isActive: b.isActive };
}

// --- Payloads de escritura ---
export interface ProductCreateInput {
  name: string; sku: string; barcode?: string; description?: string;
  categoryId?: string | null; brandId?: string | null;
  costPrice: number; salePrice: number; stock?: number; minStock?: number;
  isFavorite?: boolean; notes?: string;
}
export type ProductUpdateInput = Partial<
  Omit<ProductCreateInput, 'stock'> & { isActive: boolean }
>;

export const productsApi = {
  async list(): Promise<Product[]> {
    const data = await apiFetch<ApiProduct[]>('/products');
    return data.map(toProduct);
  },
  async create(input: ProductCreateInput): Promise<Product> {
    return toProduct(await apiFetch<ApiProduct>('/products', { method: 'POST', body: input }));
  },
  async update(id: string, input: ProductUpdateInput): Promise<Product> {
    return toProduct(await apiFetch<ApiProduct>(`/products/${id}`, { method: 'PUT', body: input }));
  },
};

export const categoriesApi = {
  async list(): Promise<Category[]> {
    return (await apiFetch<ApiCategory[]>('/categories')).map(toCategory);
  },
  async create(input: { name: string; description?: string; color?: string }): Promise<Category> {
    return toCategory(await apiFetch<ApiCategory>('/categories', { method: 'POST', body: input }));
  },
  async update(id: string, input: { name?: string; description?: string; color?: string; isActive?: boolean }): Promise<Category> {
    return toCategory(await apiFetch<ApiCategory>(`/categories/${id}`, { method: 'PUT', body: input }));
  },
};

export const brandsApi = {
  async list(): Promise<Brand[]> {
    return (await apiFetch<ApiBrand[]>('/brands')).map(toBrand);
  },
  async create(input: { name: string; description?: string }): Promise<Brand> {
    return toBrand(await apiFetch<ApiBrand>('/brands', { method: 'POST', body: input }));
  },
  async update(id: string, input: { name?: string; description?: string; isActive?: boolean }): Promise<Brand> {
    return toBrand(await apiFetch<ApiBrand>(`/brands/${id}`, { method: 'PUT', body: input }));
  },
};
