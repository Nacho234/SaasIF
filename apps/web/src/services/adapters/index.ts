import { isProdMode } from '@/config/appMode';
import type { ProductRepository } from '@/services/ports';
import { demoProductRepository } from '@/demo/repositories/productRepository';
import { apiProductRepository } from '@/services/api/productRepository';

/**
 * Punto único donde se elige la implementación (demo o prod) según `VITE_APP_MODE`.
 *
 * Las pantallas deben consumir `repositories` en lugar de importar stores/mocks/Supabase
 * directamente. En Fase 0 solo está cableado el dominio de referencia `products`;
 * la migración del resto de dominios y de las pages ocurre en la Fase 2.
 */
export const repositories: {
  products: ProductRepository;
} = {
  products: isProdMode ? apiProductRepository : demoProductRepository,
};
