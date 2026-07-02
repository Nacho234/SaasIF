import { useMemo, useState } from 'react';
import { Download, History } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useProductStore } from '@/store/productStore';
import { toast } from '@/store/uiStore';
import { formatFriendlyDateTime } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { INVENTORY_IN_TYPES, INVENTORY_MOVEMENT_LABELS } from '@/constants/labels';
import type { InventoryMovement, InventoryMovementType } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';

export function InventoryMovementsPage() {
  const movements = useInventoryStore((s) => s.movements);
  const products = useProductStore((s) => s.products);

  const [productFilter, setProductFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = useMemo(
    () =>
      movements.filter(
        (m) => (!productFilter || m.productId === productFilter) && (!typeFilter || m.type === typeFilter),
      ),
    [movements, productFilter, typeFilter],
  );

  const columns: Column<InventoryMovement>[] = [
    { key: 'date', header: 'Fecha', render: (m) => <span className="text-xs text-slate-500">{formatFriendlyDateTime(m.date)}</span> },
    { key: 'product', header: 'Producto', render: (m) => <span className="font-medium">{m.productName}</span> },
    {
      key: 'type',
      header: 'Tipo',
      render: (m) => (
        <Badge variant={INVENTORY_IN_TYPES.includes(m.type) ? 'success' : 'danger'}>
          {INVENTORY_MOVEMENT_LABELS[m.type]}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'center',
      render: (m) => (
        <span className={cn('font-bold tabular-nums', INVENTORY_IN_TYPES.includes(m.type) ? 'text-emerald-600' : 'text-red-500')}>
          {INVENTORY_IN_TYPES.includes(m.type) ? '+' : '−'}{m.quantity}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'center',
      hideOnMobile: true,
      render: (m) => (
        <span className="text-slate-500 tabular-nums">
          {m.previousStock} → <strong className="text-slate-800 dark:text-slate-200">{m.newStock}</strong>
        </span>
      ),
    },
    { key: 'reason', header: 'Motivo', hideOnMobile: true, render: (m) => <span className="text-sm">{m.reason}</span> },
    { key: 'user', header: 'Usuario', hideOnMobile: true, render: (m) => m.userName },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Movimientos de inventario"
        subtitle={`${filtered.length} movimientos`}
        backTo={ROUTES.inventory}
        actions={
          <Button
            variant="secondary"
            onClick={() => toast.info('Exportación simulada', 'En la versión completa se descarga un archivo CSV.')}
          >
            <Download className="size-4" aria-hidden />
            Exportar
          </Button>
        }
      />

      <Card className="mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <Select
          label="Producto"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          placeholder="Todos los productos"
          options={products.map((p) => ({ value: p.id, label: p.name }))}
        />
        <Select
          label="Tipo de movimiento"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          placeholder="Todos los tipos"
          options={(Object.keys(INVENTORY_MOVEMENT_LABELS) as InventoryMovementType[]).map((t) => ({
            value: t,
            label: INVENTORY_MOVEMENT_LABELS[t],
          }))}
        />
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered.slice(0, 200)}
          rowKey={(m) => m.id}
          emptyState={<EmptyState icon={History} title="No hay movimientos de stock" description="Probá con otros filtros." />}
        />
      </Card>
    </div>
  );
}
