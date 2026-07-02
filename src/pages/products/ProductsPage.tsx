import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, MoreVertical, Package, Pencil, Plus, Power, Search, SlidersHorizontal, Star, Boxes } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { toast, useUiStore } from '@/store/uiStore';
import { logAudit } from '@/services/auditService';
import { generateId } from '@/utils/id';
import { formatCurrency } from '@/utils/format';
import { calcMarginPercent } from '@/utils/calc';
import { ROUTES } from '@/constants/routes';
import type { Product } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductIcon } from '@/components/ui/ProductIcon';
import { StockBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal';

type SortKey = 'name' | 'price' | 'stock';

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = usePermissions();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const products = useProductStore((s) => s.products);
  const categories = useProductStore((s) => s.categories);
  const brands = useProductStore((s) => s.brands);
  const addProduct = useProductStore((s) => s.addProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);

  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState(searchParams.get('stock') ?? '');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [showFilters, setShowFilters] = useState(Boolean(searchParams.get('stock')));
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    let list = products.filter((p) => {
      if (statusFilter === 'active' && !p.isActive) return false;
      if (statusFilter === 'inactive' && p.isActive) return false;
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (brandFilter && p.brandId !== brandFilter) return false;
      if (stockFilter === 'low' && !(p.stock > 0 && p.stock <= p.minStock)) return false;
      if (stockFilter === 'out' && p.stock > 0) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.barcode.includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortKey === 'price') return b.salePrice - a.salePrice;
      if (sortKey === 'stock') return a.stock - b.stock;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [products, debounced, categoryFilter, brandFilter, stockFilter, statusFilter, sortKey]);

  const duplicate = (product: Product) => {
    const copy: Product = {
      ...product,
      id: generateId(),
      sku: `${product.sku}-COPIA`,
      name: `${product.name} (copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addProduct(copy);
    logAudit({ action: 'product_created', module: 'products', description: `Duplicó el producto "${product.name}"` });
    toast.success('Producto duplicado', 'Revisá el SKU y los datos de la copia.');
    navigate(ROUTES.productEdit(copy.id));
  };

  const toggleActive = (product: Product) => {
    askConfirm({
      title: product.isActive ? 'Desactivar producto' : 'Reactivar producto',
      message: product.isActive
        ? `"${product.name}" dejará de aparecer en el POS. No se borra su historial.`
        : `"${product.name}" volverá a estar disponible para la venta.`,
      confirmLabel: product.isActive ? 'Desactivar' : 'Reactivar',
      danger: product.isActive,
      onConfirm: () => {
        updateProduct(product.id, { isActive: !product.isActive });
        logAudit({
          action: product.isActive ? 'product_deactivated' : 'product_activated',
          module: 'products',
          description: `${product.isActive ? 'Desactivó' : 'Reactivó'} el producto "${product.name}"`,
          severity: 'warning',
        });
        toast.success(product.isActive ? 'Producto desactivado' : 'Producto reactivado');
      },
    });
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Producto',
      render: (p) => {
        const category = categories.find((c) => c.id === p.categoryId);
        return (
          <div className="flex items-center gap-3">
            <ProductIcon categoryId={p.categoryId} color={category?.color} size="sm" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <span className="truncate">{p.name}</span>
                {p.isFavorite && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" aria-hidden />}
                {!p.isActive && <Badge variant="outline">Inactivo</Badge>}
              </p>
              <p className="text-xs text-slate-400">{p.sku} · {category?.name ?? 'Sin categoría'}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'brand',
      header: 'Marca',
      hideOnMobile: true,
      render: (p) => brands.find((b) => b.id === p.brandId)?.name ?? '—',
    },
    {
      key: 'cost',
      header: 'Costo',
      align: 'right',
      hideOnMobile: true,
      render: (p) => <span className="tabular-nums text-slate-500">{formatCurrency(p.costPrice)}</span>,
    },
    {
      key: 'price',
      header: 'Precio',
      align: 'right',
      render: (p) => (
        <div>
          <p className="font-bold tabular-nums">{formatCurrency(p.salePrice)}</p>
          <p className="text-xs text-slate-400">{calcMarginPercent(p.costPrice, p.salePrice)}% margen</p>
        </div>
      ),
    },
    { key: 'stock', header: 'Stock', align: 'center', render: (p) => <StockBadge stock={p.stock} minStock={p.minStock} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={<MoreVertical className="size-4 text-slate-400 hover:text-slate-600" aria-label="Acciones" />}
            items={[
              ...(can('edit_products')
                ? [
                    { label: 'Editar', icon: <Pencil className="size-4" />, onClick: () => navigate(ROUTES.productEdit(p.id)) },
                    { label: 'Duplicar', icon: <Copy className="size-4" />, onClick: () => duplicate(p) },
                    {
                      label: p.isFavorite ? 'Quitar de favoritos' : 'Marcar favorito',
                      icon: <Star className="size-4" />,
                      onClick: () => updateProduct(p.id, { isFavorite: !p.isFavorite }),
                    },
                  ]
                : []),
              ...(can('adjust_stock')
                ? [{ label: 'Ajustar stock', icon: <Boxes className="size-4" />, onClick: () => setAdjustProduct(p) }]
                : []),
              ...(can('edit_products')
                ? ['separator' as const, { label: p.isActive ? 'Desactivar' : 'Reactivar', icon: <Power className="size-4" />, danger: p.isActive, onClick: () => toggleActive(p) }]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Productos"
        subtitle={`${filtered.length} de ${products.length} productos`}
        actions={
          can('edit_products') && (
            <Link to={ROUTES.productCreate}>
              <Button>
                <Plus className="size-4" aria-hidden />
                Nuevo producto
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            leftIcon={<Search className="size-4" />}
            placeholder="Buscar por nombre, SKU o código de barras…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            containerClassName="flex-1"
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="size-4" aria-hidden />
              Filtros
            </Button>
            <Select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              options={[
                { value: 'name', label: 'Ordenar: nombre' },
                { value: 'price', label: 'Ordenar: precio' },
                { value: 'stock', label: 'Ordenar: stock' },
              ]}
              aria-label="Ordenar"
            />
          </div>
        </div>
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4 dark:border-slate-800">
            <Select
              label="Categoría"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="Todas"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Marca"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder="Todas"
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
            />
            <Select
              label="Stock"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              placeholder="Todos"
              options={[
                { value: 'low', label: 'Bajo stock' },
                { value: 'out', label: 'Sin stock' },
              ]}
            />
            <Select
              label="Estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' },
                { value: 'all', label: 'Todos' },
              ]}
            />
          </div>
        )}
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(ROUTES.productDetail(p.id))}
          emptyState={
            <EmptyState
              icon={Package}
              title="No hay productos cargados"
              description="Creá tu primer producto o ajustá los filtros de búsqueda."
              action={
                can('edit_products') && (
                  <Link to={ROUTES.productCreate}>
                    <Button>
                      <Plus className="size-4" aria-hidden />
                      Crear producto
                    </Button>
                  </Link>
                )
              }
            />
          }
        />
      </Card>

      <StockAdjustModal open={adjustProduct !== null} onClose={() => setAdjustProduct(null)} product={adjustProduct} />
    </div>
  );
}
