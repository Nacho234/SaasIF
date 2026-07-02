/**
 * Contratos (puertos) del acceso a datos. Un archivo por dominio.
 *
 * Estado (Fase 0): definido el dominio de referencia `ProductRepository`.
 * En Fase 2 se agregan los demás siguiendo el mismo patrón:
 *   salesRepository, cashRepository, customerRepository, inventoryRepository,
 *   supplierRepository, purchaseRepository, expenseRepository, authRepository, etc.
 */
export type { ProductRepository } from './productRepository';
