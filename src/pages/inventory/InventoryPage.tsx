import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, DollarSign, History, PackageX, Plus } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { formatMoney, formatFriendlyDateTime } from '@/utils/format';
import { round2 } from '@/utils/calc';
import { ROUTES } from '@/constants/routes';
import { INVENTORY_IN_TYPES, INVENTORY_MOVEMENT_LABELS } from '@/constants/labels';
import type { Product } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { StockBadge } from '@/components/ui/StatusBadge';
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal';
import { cn } from '@/utils/cn';

export function InventoryPage() {
  const navigate = useNavigate();
  const allProducts = useProductStore((s) => s.products);
  const movements = useInventoryStore((s) => s.movements);
  const products = useMemo(() => allProducts.filter((p) => p.isActive), [allProducts]);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  const inventoryValue = useMemo(
    () => round2(products.reduce((acc, p) => acc + Math.max(0, p.stock) * p.costPrice, 0)),
    [products],
  );
  const retailValue = useMemo(
    () => round2(products.reduce((acc, p) => acc + Math.max(0, p.stock) * p.salePrice, 0)),
    [products],
  );
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  const outOfStock = products.filter((p) => p.stock <= 0);
  const recent = movements.slice(0, 10);

  const openAdjust = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (product) setAdjustProduct(product);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventario"
        subtitle="Resumen de stock y movimientos"
        actions={
          <Link to={ROUTES.inventoryMovements}>
            <Button variant="secondary">
              <History className="size-4" aria-hidden />
              Todos los movimientos
            </Button>
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Valor a costo" value={formatMoney(inventoryValue)} icon={DollarSign} tone="primary" hint="Stock × costo" />
        <StatCard label="Valor a precio de venta" value={formatMoney(retailValue)} icon={DollarSign} hint="Stock × precio" />
        <StatCard label="Bajo stock" value={lowStock.length} icon={AlertTriangle} tone={lowStock.length ? 'warning' : 'default'} />
        <StatCard label="Sin stock" value={outOfStock.length} icon={PackageX} tone={outOfStock.length ? 'danger' : 'default'} />
      </div>

      {/* Ajuste rápido */}
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            label="Ajustar stock de un producto"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            placeholder="Elegir producto…"
            options={products.map((p) => ({ value: p.id, label: `${p.name} (stock: ${p.stock})` }))}
            containerClassName="flex-1"
          />
          <Button onClick={openAdjust} disabled={!selectedProductId}>
            <Plus className="size-4" aria-hidden />
            Ingresar / egresar / ajustar
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Productos que necesitan reposición" subtitle={`${lowStock.length + outOfStock.length} productos`} />
          <CardBody className="px-2">
            {lowStock.length + outOfStock.length === 0 ? (
              <EmptyState icon={Boxes} title="Stock saludable" description="Ningún producto está bajo el mínimo." className="py-6" />
            ) : (
              <ul className="flex flex-col">
                {[...outOfStock, ...lowStock].map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate(ROUTES.productDetail(p.id))}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                        <span className="block text-xs text-slate-400">{p.sku} · mínimo {p.minStock}</span>
                      </span>
                      <StockBadge stock={p.stock} minStock={p.minStock} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Movimientos recientes"
            action={<Link to={ROUTES.inventoryMovements} className="text-xs font-semibold text-primary-600 hover:underline">Ver todos</Link>}
          />
          <CardBody className="px-2">
            {recent.length === 0 ? (
              <EmptyState icon={History} title="No hay movimientos de stock" className="py-6" />
            ) : (
              <ul className="flex flex-col">
                {recent.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-2">
                    <span className={cn('w-10 text-center text-sm font-bold tabular-nums', INVENTORY_IN_TYPES.includes(m.type) ? 'text-emerald-600' : 'text-red-500')}>
                      {INVENTORY_IN_TYPES.includes(m.type) ? '+' : '−'}{m.quantity}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-300">{m.productName}</span>
                      <span className="block text-xs text-slate-400">
                        {INVENTORY_MOVEMENT_LABELS[m.type]} · {formatFriendlyDateTime(m.date)}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">→ {m.newStock} u.</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <StockAdjustModal
        open={adjustProduct !== null}
        onClose={() => setAdjustProduct(null)}
        product={adjustProduct}
      />
    </div>
  );
}
