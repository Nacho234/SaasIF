import type { ProductRepository } from '@/services/ports';
import { useProductStore } from '@/store/productStore';

/**
 * Implementación DEMO del repositorio de productos: delega en el store de Zustand
 * (persistido en localStorage). No duplica lógica; envuelve lo existente en Promesas
 * para cumplir el contrato async del puerto.
 */
export const demoProductRepository: ProductRepository = {
  async list() {
    return useProductStore.getState().products;
  },
  async getById(id) {
    return useProductStore.getState().products.find((p) => p.id === id) ?? null;
  },
  async create(product) {
    useProductStore.getState().addProduct(product);
    return product;
  },
  async update(id, patch) {
    useProductStore.getState().updateProduct(id, patch);
    const updated = useProductStore.getState().products.find((p) => p.id === id);
    if (!updated) throw new Error(`Producto ${id} no encontrado`);
    return updated;
  },
  async setStock(id, stock) {
    useProductStore.getState().setStock(id, stock);
  },
};
