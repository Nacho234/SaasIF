import type { Product } from '@/types';

/**
 * Contrato de acceso a datos de productos (async, pensado para backend real).
 *
 * Lo implementan:
 *  - `src/demo/repositories/productRepository.ts` (modo demo: stores + localStorage)
 *  - `src/services/api/productRepository.ts` (modo prod: Supabase — todavía stub)
 *
 * Las pantallas NO deben importar estas implementaciones directo: consumen
 * `repositories` desde `@/services/adapters`. La migración de pages al adapter
 * ocurre en la Fase 2 (ver docs/HANDOFF-arquitectura-produccion.md).
 */
export interface ProductRepository {
  list(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  create(product: Product): Promise<Product>;
  update(id: string, patch: Partial<Product>): Promise<Product>;
  setStock(id: string, stock: number): Promise<void>;
}
