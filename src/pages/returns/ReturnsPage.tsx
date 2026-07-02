import { Link, useNavigate } from 'react-router-dom';
import { Plus, Undo2 } from 'lucide-react';
import { useSalesStore } from '@/store/salesStore';
import { formatCurrency, formatFriendlyDateTime } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { REFUND_METHOD_LABELS, RETURN_REASON_LABELS } from '@/constants/labels';
import type { SaleReturn } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';

export function ReturnsPage() {
  const navigate = useNavigate();
  const returns = useSalesStore((s) => s.returns);

  const columns: Column<SaleReturn>[] = [
    { key: 'date', header: 'Fecha', render: (r) => <span className="text-xs text-slate-500">{formatFriendlyDateTime(r.date)}</span> },
    { key: 'sale', header: 'Venta', render: (r) => <span className="font-semibold">{r.saleNumber}</span> },
    {
      key: 'items',
      header: 'Productos',
      render: (r) => (
        <span className="text-sm">
          {r.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
        </span>
      ),
    },
    { key: 'reason', header: 'Motivo', hideOnMobile: true, render: (r) => RETURN_REASON_LABELS[r.reason] },
    {
      key: 'method',
      header: 'Devolución',
      hideOnMobile: true,
      render: (r) => <Badge variant="info">{REFUND_METHOD_LABELS[r.refundMethod]}</Badge>,
    },
    { key: 'user', header: 'Usuario', hideOnMobile: true, render: (r) => r.userName },
    {
      key: 'amount',
      header: 'Reintegro',
      align: 'right',
      render: (r) => (
        <span className="font-bold text-red-500 tabular-nums">
          {r.refundAmount > 0 ? `−${formatCurrency(r.refundAmount)}` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Devoluciones y cambios"
        subtitle={`${returns.length} devoluciones registradas`}
        actions={
          <Link to={ROUTES.returnCreate}>
            <Button>
              <Plus className="size-4" aria-hidden />
              Nueva devolución
            </Button>
          </Link>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          rows={returns}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(ROUTES.saleDetail(r.saleId))}
          emptyState={
            <EmptyState
              icon={Undo2}
              title="No hay devoluciones"
              description="Cuando registres una devolución o cambio va a aparecer acá con su detalle."
              action={
                <Link to={ROUTES.returnCreate}>
                  <Button>Registrar devolución</Button>
                </Link>
              }
            />
          }
        />
      </Card>
    </div>
  );
}
