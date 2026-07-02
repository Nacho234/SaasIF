import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Boxes, Package, Pencil, Receipt, Star, Truck } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSalesStore } from '@/store/salesStore';
import { useSupplierStore } from '@/store/supplierStore';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatFriendlyDateTime, formatMoney, formatPercent } from '@/utils/format';
import { calcMarginPercent } from '@/utils/calc';
import { ROUTES } from '@/constants/routes';
import { INVENTORY_IN_TYPES, INVENTORY_MOVEMENT_LABELS } from '@/constants/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductIcon } from '@/components/ui/ProductIcon';
import { StockBadge } from '@/components/ui/StatusBadge';
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal';
import { cn } from '@/utils/cn';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const product = useProductStore((s) => s.products.find((p) => p.id === id));
  const categories = useProductStore((s) => s.categories);
  const brands = useProductStore((s) => s.brands);
  const suppliers = useSupplierStore((s) => s.suppliers);
  const allMovements = useInventoryStore((s) => s.movements);
  const allSales = useSalesStore((s) => s.sales);
  const movements = useMemo(
    () => allMovements.filter((m) => m.productId === id).slice(0, 15),
    [allMovements, id],
  );
  const sales = useMemo(
    () => allSales.filter((sale) => sale.items.some((i) => i.productId === id)).slice(0, 8),
    [allSales, id],
  );
  const [adjustOpen, setAdjustOpen] = useState(false);

  const soldUnits = useMemo(
    () =>
      sales.reduce(
        (acc, sale) => acc + sale.items.filter((i) => i.productId === id).reduce((a, i) => a + i.quantity, 0),
        0,
      ),
    [sales, id],
  );

  if (!product) {
    return (
      <EmptyState
        icon={Package}
        title="Producto no encontrado"
        action={<Button onClick={() => navigate(ROUTES.products)}>Volver a productos</Button>}
      />
    );
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const brand = brands.find((b) => b.id === product.brandId);
  const supplier = suppliers.find((s) => s.id === product.supplierId);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {product.name}
            {product.isFavorite && <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden />}
            {!product.isActive && <Badge variant="outline">Inactivo</Badge>}
          </span>
        }
        subtitle={`${product.sku}${product.barcode ? ` · ${product.barcode}` : ''} · ${category?.name ?? 'Sin categoría'}`}
        backTo={ROUTES.products}
        actions={
          <>
            {can('adjust_stock') && (
              <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
                <Boxes className="size-4" aria-hidden />
                Ajustar stock
              </Button>
            )}
            {can('edit_products') && (
              <Button onClick={() => navigate(ROUTES.productEdit(product.id))}>
                <Pencil className="size-4" aria-hidden />
                Editar
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Precio de venta" value={formatMoney(product.salePrice)} icon={Receipt} tone="primary" hint={`Costo: ${formatMoney(product.costPrice)}`} />
        <StatCard label="Margen" value={formatPercent(calcMarginPercent(product.costPrice, product.salePrice))} icon={Star} tone="success" />
        <StatCard
          label="Stock actual"
          value={`${product.stock} u.`}
          icon={Boxes}
          tone={product.stock <= 0 ? 'danger' : product.stock <= product.minStock ? 'warning' : 'default'}
          hint={`Mínimo: ${product.minStock}`}
        />
        <StatCard label="Vendidos (últimas ventas)" value={`${soldUnits} u.`} icon={Package} />
      </div>

      {(product.stock <= product.minStock) && (
        <div className={cn('mb-4 rounded-xl px-4 py-3 text-sm font-medium', product.stock <= 0 ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300')}>
          {product.stock <= 0 ? 'Este producto está sin stock.' : 'Este producto está por debajo del stock mínimo.'} Considerá crear una orden de compra.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Ficha del producto" />
          <CardBody>
            <div className="mb-4 flex justify-center">
              <ProductIcon categoryId={product.categoryId} color={category?.color} size="xl" />
            </div>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Categoría</dt><dd className="font-medium">{category?.name ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Marca</dt><dd className="font-medium">{brand?.name ?? '—'}</dd></div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Proveedor</dt>
                <dd className="font-medium">
                  {supplier ? (
                    <Link to={ROUTES.supplierDetail(supplier.id)} className="text-primary-600 hover:underline">
                      {supplier.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="flex justify-between"><dt className="text-slate-500">Estado</dt><dd><StockBadge stock={product.stock} minStock={product.minStock} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Creado</dt><dd className="text-xs">{formatFriendlyDateTime(product.createdAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Última modificación</dt><dd className="text-xs">{formatFriendlyDateTime(product.updatedAt)}</dd></div>
            </dl>
            {product.description && <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{product.description}</p>}
            {product.notes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">Nota interna: {product.notes}</p>}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Kardex (movimientos de stock)" subtitle="Últimos 15 movimientos" action={<Truck className="size-4 text-slate-300" aria-hidden />} />
          <CardBody className="px-2">
            {movements.length === 0 ? (
              <EmptyState icon={Boxes} title="Sin movimientos de stock" className="py-6" />
            ) : (
              <ul className="flex flex-col">
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 border-b border-slate-50 px-3 py-2.5 last:border-0 dark:border-slate-800/50">
                    <span className={cn('w-10 text-center text-sm font-bold tabular-nums', INVENTORY_IN_TYPES.includes(m.type) ? 'text-emerald-600' : 'text-red-500')}>
                      {INVENTORY_IN_TYPES.includes(m.type) ? '+' : '−'}{m.quantity}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {INVENTORY_MOVEMENT_LABELS[m.type]} · {m.reason}
                      </span>
                      <span className="block text-xs text-slate-400">{formatFriendlyDateTime(m.date)} · {m.userName}</span>
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">{m.previousStock} → <strong>{m.newStock}</strong></span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Ventas recientes con este producto" />
        <CardBody className="px-2">
          {sales.length === 0 ? (
            <EmptyState icon={Receipt} title="Todavía no se vendió" className="py-6" />
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {sales.map((sale) => {
                const item = sale.items.find((i) => i.productId === id)!;
                return (
                  <li key={sale.id}>
                    <Link to={ROUTES.saleDetail(sale.id)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <span>
                        <span className="block text-sm font-semibold">{sale.saleNumber}</span>
                        <span className="block text-xs text-slate-400">{formatFriendlyDateTime(sale.date)}</span>
                      </span>
                      <span className="text-sm tabular-nums">
                        {item.quantity} u. · <strong>{formatCurrency(item.subtotal)}</strong>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <StockAdjustModal open={adjustOpen} onClose={() => setAdjustOpen(false)} product={product} />
    </div>
  );
}
