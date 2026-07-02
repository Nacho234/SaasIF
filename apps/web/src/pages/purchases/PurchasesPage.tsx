import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { useSupplierStore } from '@/store/supplierStore';
import { formatMoney, formatFriendlyDateTime } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { Purchase } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PurchaseStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

const columns: Column<Purchase>[] = [
  { key: 'number', header: 'Orden', render: (p) => <span className="font-semibold">{p.number}</span> },
  { key: 'date', header: 'Fecha', render: (p) => <span className="text-xs text-slate-500">{formatFriendlyDateTime(p.date)}</span> },
  { key: 'supplier', header: 'Proveedor', render: (p) => p.supplierName },
  { key: 'items', header: 'Ítems', align: 'center', hideOnMobile: true, render: (p) => p.items.length },
  { key: 'creator', header: 'Creada por', hideOnMobile: true, render: (p) => p.createdByName },
  { key: 'status', header: 'Estado', render: (p) => <PurchaseStatusBadge status={p.status} /> },
  { key: 'total', header: 'Total', align: 'right', render: (p) => <span className="font-bold tabular-nums">{formatMoney(p.total)}</span> },
];

export function PurchasesPage() {
  const navigate = useNavigate();
  const purchases = useSupplierStore((s) => s.purchases);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Compras"
        subtitle={`${purchases.length} órdenes de compra`}
        actions={
          <Link to={ROUTES.purchaseCreate}>
            <Button>
              <Plus className="size-4" aria-hidden />
              Nueva compra
            </Button>
          </Link>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          rows={purchases}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(ROUTES.purchaseDetail(p.id))}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No hay compras"
              description="Creá una orden de compra para reponer stock. Al recibirla, el inventario se actualiza solo."
              action={
                <Link to={ROUTES.purchaseCreate}>
                  <Button>Crear orden</Button>
                </Link>
              }
            />
          }
        />
      </Card>
    </div>
  );
}
