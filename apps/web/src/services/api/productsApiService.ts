import type { Brand, Category, Product } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase/supabaseClient';
import { ApiError } from './apiClient';

// --- Filas de Supabase (columnas camelCase, igual que el schema) ---
interface Row {
  id: string;
  businessId: string;
  [k: string]: unknown;
}

function businessId(): string {
  const id = useAuthStore.getState().businessId;
  if (!id) throw new ApiError(401, 'No hay una sesión activa.');
  return id;
}

/** Convierte un error de Supabase en ApiError (con mensaje claro) para que las pantallas lo muestren. */
function fail(error: { code?: string; message: string }): never {
  if (error.code === '23505') throw new ApiError(409, 'El SKU ya existe en este negocio.');
  throw new ApiError(400, error.message);
}

function toProduct(p: Row): Product {
  return {
    id: p.id as string,
    sku: (p.sku as string) ?? '',
    barcode: (p.barcode as string) ?? '',
    name: (p.name as string) ?? '',
    description: (p.description as string) ?? '',
    categoryId: (p.categoryId as string) ?? '',
    brandId: (p.brandId as string) ?? null,
    supplierId: null, // proveedores: dominio futuro
    costPrice: Number(p.costPrice ?? 0),
    salePrice: Number(p.salePrice ?? 0),
    stock: Number(p.stock ?? 0),
    minStock: Number(p.minStock ?? 0),
    image: (p.imageUrl as string) ?? null,
    isActive: Boolean(p.isActive),
    isFavorite: Boolean(p.isFavorite),
    notes: (p.notes as string) ?? '',
    createdAt: (p.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (p.updatedAt as string) ?? new Date().toISOString(),
  };
}
function toCategory(c: Row): Category {
  return {
    id: c.id as string,
    name: (c.name as string) ?? '',
    description: (c.description as string) ?? '',
    color: (c.color as string) ?? '#64748b',
    isActive: Boolean(c.isActive),
  };
}
function toBrand(b: Row): Brand {
  return {
    id: b.id as string,
    name: (b.name as string) ?? '',
    description: (b.description as string) ?? '',
    isActive: Boolean(b.isActive),
  };
}

export interface ProductCreateInput {
  name: string; sku: string; barcode?: string; description?: string;
  categoryId?: string | null; brandId?: string | null;
  costPrice: number; salePrice: number; stock?: number; minStock?: number;
  isFavorite?: boolean; notes?: string;
}
export type ProductUpdateInput = Partial<Omit<ProductCreateInput, 'stock'> & { isActive: boolean }>;

export const productsApi = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (error) fail(error);
    return (data as Row[]).map(toProduct);
  },
  async create(input: ProductCreateInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        businessId: businessId(),
        name: input.name,
        sku: input.sku,
        barcode: input.barcode ?? '',
        description: input.description ?? '',
        categoryId: input.categoryId || null,
        brandId: input.brandId || null,
        costPrice: input.costPrice,
        salePrice: input.salePrice,
        stock: input.stock ?? 0,
        minStock: input.minStock ?? 0,
        isFavorite: input.isFavorite ?? false,
        notes: input.notes ?? '',
      })
      .select()
      .single();
    if (error) fail(error);
    return toProduct(data as Row);
  },
  async update(id: string, input: ProductUpdateInput): Promise<Product> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.sku !== undefined) patch.sku = input.sku;
    if (input.barcode !== undefined) patch.barcode = input.barcode;
    if (input.description !== undefined) patch.description = input.description;
    if (input.categoryId !== undefined) patch.categoryId = input.categoryId || null;
    if (input.brandId !== undefined) patch.brandId = input.brandId || null;
    if (input.costPrice !== undefined) patch.costPrice = input.costPrice;
    if (input.salePrice !== undefined) patch.salePrice = input.salePrice;
    if (input.minStock !== undefined) patch.minStock = input.minStock;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    if (input.isFavorite !== undefined) patch.isFavorite = input.isFavorite;
    if (input.notes !== undefined) patch.notes = input.notes;
    const { data, error } = await supabase.from('products').update(patch).eq('id', id).select().single();
    if (error) fail(error);
    return toProduct(data as Row);
  },
};

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (error) fail(error);
    return (data as Row[]).map(toCategory);
  },
  async create(input: { name: string; description?: string; color?: string }): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ businessId: businessId(), name: input.name, description: input.description ?? '', color: input.color ?? '#64748b' })
      .select()
      .single();
    if (error) fail(error);
    return toCategory(data as Row);
  },
  async update(id: string, input: { name?: string; description?: string; color?: string; isActive?: boolean }): Promise<Category> {
    const { data, error } = await supabase.from('categories').update(input).eq('id', id).select().single();
    if (error) fail(error);
    return toCategory(data as Row);
  },
};

export const brandsApi = {
  async list(): Promise<Brand[]> {
    const { data, error } = await supabase.from('brands').select('*').order('name', { ascending: true });
    if (error) fail(error);
    return (data as Row[]).map(toBrand);
  },
  async create(input: { name: string; description?: string }): Promise<Brand> {
    const { data, error } = await supabase
      .from('brands')
      .insert({ businessId: businessId(), name: input.name, description: input.description ?? '' })
      .select()
      .single();
    if (error) fail(error);
    return toBrand(data as Row);
  },
  async update(id: string, input: { name?: string; description?: string; isActive?: boolean }): Promise<Brand> {
    const { data, error } = await supabase.from('brands').update(input).eq('id', id).select().single();
    if (error) fail(error);
    return toBrand(data as Row);
  },
};
