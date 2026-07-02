import type { ProductRepository } from '@/services/ports';
import { NotImplementedError } from './notImplemented';

/**
 * Implementación PROD (Supabase) del repositorio de productos. STUB.
 * En Fase 2 cada método hace la query/insert/update contra Supabase (con RLS y business_id).
 */
export const apiProductRepository: ProductRepository = {
  async list() {
    throw new NotImplementedError('products.list');
  },
  async getById() {
    throw new NotImplementedError('products.getById');
  },
  async create() {
    throw new NotImplementedError('products.create');
  },
  async update() {
    throw new NotImplementedError('products.update');
  },
  async setStock() {
    throw new NotImplementedError('products.setStock');
  },
};
