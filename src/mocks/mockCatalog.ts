import type { Brand, Category, Combo, Product } from '@/types';

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-ali-perro', name: 'Alimento para perros', description: 'Balanceados secos y húmedos', color: '#f59e0b', isActive: true },
  { id: 'cat-ali-gato', name: 'Alimento para gatos', description: 'Balanceados secos y húmedos', color: '#8b5cf6', isActive: true },
  { id: 'cat-snacks', name: 'Snacks', description: 'Premios y golosinas', color: '#ec4899', isActive: true },
  { id: 'cat-juguetes', name: 'Juguetes', description: 'Juguetes y entretenimiento', color: '#22c55e', isActive: true },
  { id: 'cat-higiene', name: 'Higiene', description: 'Shampoo, cepillos y cuidado', color: '#06b6d4', isActive: true },
  { id: 'cat-accesorios', name: 'Accesorios', description: 'Transportadoras y varios', color: '#64748b', isActive: true },
  { id: 'cat-camas', name: 'Camas', description: 'Camas y colchonetas', color: '#a855f7', isActive: true },
  { id: 'cat-correas', name: 'Correas y collares', description: 'Paseo y sujeción', color: '#ef4444', isActive: true },
  { id: 'cat-comederos', name: 'Comederos', description: 'Comederos y bebederos', color: '#0ea5e9', isActive: true },
  { id: 'cat-arena', name: 'Arena sanitaria', description: 'Piedritas y arenas', color: '#78716c', isActive: true },
];

export const MOCK_BRANDS: Brand[] = [
  { id: 'br-royal', name: 'Royal Canin', description: '', isActive: true },
  { id: 'br-proplan', name: 'Pro Plan', description: '', isActive: true },
  { id: 'br-pedigree', name: 'Pedigree', description: '', isActive: true },
  { id: 'br-eukanuba', name: 'Eukanuba', description: '', isActive: true },
  { id: 'br-oldprince', name: 'Old Prince', description: '', isActive: true },
  { id: 'br-excellent', name: 'Excellent', description: '', isActive: true },
  { id: 'br-whiskas', name: 'Whiskas', description: '', isActive: true },
  { id: 'br-sieger', name: 'Sieger', description: '', isActive: true },
  { id: 'br-vitalcan', name: 'Vitalcan', description: '', isActive: true },
  { id: 'br-agility', name: 'Agility', description: '', isActive: true },
  { id: 'br-propia', name: 'Marca propia', description: '', isActive: true },
];

interface ProductSeed {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  brandId: string | null;
  supplierId: string | null;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  isFavorite?: boolean;
  description?: string;
}

function product(seed: ProductSeed, index: number): Product {
  return {
    id: seed.id,
    sku: seed.sku,
    barcode: `779${String(4100200 + index * 37)}${String((index * 7) % 10)}`,
    name: seed.name,
    description: seed.description ?? '',
    categoryId: seed.categoryId,
    brandId: seed.brandId,
    supplierId: seed.supplierId,
    costPrice: seed.costPrice,
    salePrice: seed.salePrice,
    stock: seed.stock,
    minStock: seed.minStock,
    image: null,
    isActive: true,
    isFavorite: seed.isFavorite ?? false,
    notes: '',
    createdAt: '2026-02-01T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
  };
}

const SEEDS: ProductSeed[] = [
  { id: 'prod-1', sku: 'ALI-001', name: 'Alimento perro adulto 15kg', categoryId: 'cat-ali-perro', brandId: 'br-oldprince', supplierId: 'sup-3', costPrice: 62000, salePrice: 89900, stock: 14, minStock: 5, isFavorite: true, description: 'Bolsa 15kg sabor carne y arroz, razas medianas y grandes.' },
  { id: 'prod-2', sku: 'ALI-002', name: 'Alimento cachorro 15kg', categoryId: 'cat-ali-perro', brandId: 'br-vitalcan', supplierId: 'sup-3', costPrice: 68500, salePrice: 98500, stock: 8, minStock: 4, isFavorite: true },
  { id: 'prod-3', sku: 'ALI-003', name: 'Alimento perro adulto premium 15kg', categoryId: 'cat-ali-perro', brandId: 'br-royal', supplierId: 'sup-1', costPrice: 129000, salePrice: 178900, stock: 6, minStock: 3 },
  { id: 'prod-4', sku: 'ALI-004', name: 'Alimento perro senior 12kg', categoryId: 'cat-ali-perro', brandId: 'br-proplan', supplierId: 'sup-1', costPrice: 98000, salePrice: 139900, stock: 4, minStock: 4 },
  { id: 'prod-5', sku: 'ALI-010', name: 'Alimento gato adulto 10kg', categoryId: 'cat-ali-gato', brandId: 'br-excellent', supplierId: 'sup-1', costPrice: 74000, salePrice: 105900, stock: 9, minStock: 4, isFavorite: true },
  { id: 'prod-6', sku: 'ALI-011', name: 'Alimento gato castrado 7,5kg', categoryId: 'cat-ali-gato', brandId: 'br-royal', supplierId: 'sup-1', costPrice: 96500, salePrice: 134900, stock: 5, minStock: 3 },
  { id: 'prod-7', sku: 'ALI-012', name: 'Lata alimento húmedo gato 340g', categoryId: 'cat-ali-gato', brandId: 'br-whiskas', supplierId: 'sup-2', costPrice: 1900, salePrice: 3200, stock: 48, minStock: 12, isFavorite: true },
  { id: 'prod-8', sku: 'SNA-001', name: 'Snack dental perro x7', categoryId: 'cat-snacks', brandId: 'br-pedigree', supplierId: 'sup-2', costPrice: 3400, salePrice: 5600, stock: 26, minStock: 10, isFavorite: true },
  { id: 'prod-9', sku: 'SNA-002', name: 'Galletitas de hígado 500g', categoryId: 'cat-snacks', brandId: 'br-propia', supplierId: 'sup-3', costPrice: 2100, salePrice: 4200, stock: 3, minStock: 6 },
  { id: 'prod-10', sku: 'JUG-001', name: 'Juguete mordillo caucho', categoryId: 'cat-juguetes', brandId: 'br-propia', supplierId: 'sup-2', costPrice: 3800, salePrice: 7500, stock: 18, minStock: 5, isFavorite: true },
  { id: 'prod-11', sku: 'JUG-002', name: 'Pelota con sonido mediana', categoryId: 'cat-juguetes', brandId: 'br-propia', supplierId: 'sup-2', costPrice: 2900, salePrice: 5900, stock: 22, minStock: 6 },
  { id: 'prod-12', sku: 'HIG-001', name: 'Shampoo para perros 500ml', categoryId: 'cat-higiene', brandId: 'br-propia', supplierId: 'sup-4', costPrice: 4100, salePrice: 7900, stock: 12, minStock: 4 },
  { id: 'prod-13', sku: 'HIG-002', name: 'Cepillo deslanador', categoryId: 'cat-higiene', brandId: 'br-agility', supplierId: 'sup-4', costPrice: 6800, salePrice: 12500, stock: 7, minStock: 3 },
  { id: 'prod-14', sku: 'HIG-003', name: 'Antipulgas genérico (visual demo)', categoryId: 'cat-higiene', brandId: 'br-propia', supplierId: 'sup-4', costPrice: 8900, salePrice: 15900, stock: 0, minStock: 5, description: 'Producto de demostración sin indicaciones reales.' },
  { id: 'prod-15', sku: 'ACC-001', name: 'Transportadora chica', categoryId: 'cat-accesorios', brandId: 'br-agility', supplierId: 'sup-4', costPrice: 24500, salePrice: 39900, stock: 5, minStock: 2 },
  { id: 'prod-16', sku: 'ACC-002', name: 'Bebedero portátil 500ml', categoryId: 'cat-accesorios', brandId: 'br-agility', supplierId: 'sup-4', costPrice: 5600, salePrice: 10900, stock: 11, minStock: 4 },
  { id: 'prod-17', sku: 'CAM-001', name: 'Cama mediana lavable', categoryId: 'cat-camas', brandId: 'br-propia', supplierId: 'sup-2', costPrice: 21000, salePrice: 36500, stock: 6, minStock: 2 },
  { id: 'prod-18', sku: 'COR-001', name: 'Collar mediano nylon', categoryId: 'cat-correas', brandId: 'br-sieger', supplierId: 'sup-2', costPrice: 4300, salePrice: 8900, stock: 15, minStock: 5 },
  { id: 'prod-19', sku: 'COR-002', name: 'Correa reforzada 1,5m', categoryId: 'cat-correas', brandId: 'br-sieger', supplierId: 'sup-2', costPrice: 6900, salePrice: 12900, stock: 10, minStock: 4 },
  { id: 'prod-20', sku: 'COR-003', name: 'Pretal ajustable mediano', categoryId: 'cat-correas', brandId: 'br-sieger', supplierId: 'sup-2', costPrice: 8200, salePrice: 14900, stock: 2, minStock: 4 },
  { id: 'prod-21', sku: 'COM-001', name: 'Comedero acero inoxidable 1L', categoryId: 'cat-comederos', brandId: 'br-propia', supplierId: 'sup-2', costPrice: 5200, salePrice: 9800, stock: 14, minStock: 5 },
  { id: 'prod-22', sku: 'ARE-001', name: 'Arena sanitaria 4kg', categoryId: 'cat-arena', brandId: 'br-propia', supplierId: 'sup-1', costPrice: 3600, salePrice: 6500, stock: 30, minStock: 10, isFavorite: true },
  { id: 'prod-23', sku: 'ARE-002', name: 'Piedritas aglomerantes 8kg', categoryId: 'cat-arena', brandId: 'br-propia', supplierId: 'sup-1', costPrice: 6400, salePrice: 11500, stock: 0, minStock: 6 },
  { id: 'prod-24', sku: 'ALI-013', name: 'Alimento gato kitten 1,5kg', categoryId: 'cat-ali-gato', brandId: 'br-proplan', supplierId: 'sup-1', costPrice: 13800, salePrice: 21500, stock: 9, minStock: 4 },
];

export const MOCK_PRODUCTS: Product[] = SEEDS.map(product);

export const MOCK_COMBOS: Combo[] = [
  {
    id: 'combo-1',
    name: 'Combo Cachorro Feliz',
    description: 'Alimento cachorro 15kg + mordillo + snack dental',
    items: [
      { productId: 'prod-2', quantity: 1 },
      { productId: 'prod-10', quantity: 1 },
      { productId: 'prod-8', quantity: 1 },
    ],
    comboPrice: 103900,
    isActive: true,
    createdAt: '2026-05-10T12:00:00.000Z',
  },
  {
    id: 'combo-2',
    name: 'Combo Gato Completo',
    description: 'Alimento gato adulto 10kg + arena sanitaria 4kg',
    items: [
      { productId: 'prod-5', quantity: 1 },
      { productId: 'prod-22', quantity: 1 },
    ],
    comboPrice: 99900,
    isActive: true,
    createdAt: '2026-05-18T12:00:00.000Z',
  },
];
