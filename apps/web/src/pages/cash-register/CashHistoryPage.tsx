import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useCashStore } from '@/store/cashStore';
import { formatCurrency, formatFriendlyDateTime } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { CashStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CashRegister } from '@/types';
import { cn } from '@/utils/cn';

const columns: Column<CashRegister>[] = [
  { key: 'number', header: 'Caja', render: (r) => <span className="font-semibold">{r.number}</span> },
  {
    key: 'opened',
    header: 'Apertura',
    render: (r) => (
      <div>
        <p className="text-sm">{formatFriendlyDateTime(r.openedAt)}</p>
        <p className="text-xs text-slate-400">{r.openedByName}</p>
      </div>
    ),
  },
  {
    key: 'closed',
    header: 'Cierre',
    hideOnMobile: true,
    render: (r) =>
      r.closedAt ? (
        <div>
          <p className="text-sm">{formatFriendlyDateTime(r.closedAt)}</p>
          <p className="text-xs text-slate-400">{r.closedByName}</p>
        </div>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: 'opening',
    header: 'Inicial',
    align: 'right',
    hideOnMobile: true,
    render: (r) => <span className="tabular-nums">{formatCurrency(r.openingAmount)}</span>,
  },
  {
    key: 'counted',
    header: 'Contado',
    align: 'right',
    render: (r) => <span className="tabular-nums">{r.countedCash != null ? formatCurrency(r.countedCash) : '—'}</span>,
  },
  {
    key: 'difference',
    header: 'Diferencia',
    align: 'right',
    render: (r) =>
      r.difference == null ? (
        <span className="text-slate-400">—</span>
      ) : (
        <span
          className={cn(
            'font-semibold tabular-nums',
            r.difference === 0 ? 'text-emerald-600' : 'text-amber-600',
          )}
        >
          {r.difference > 0 ? '+' : ''}
          {formatCurrency(r.difference)}
        </span>
      ),
  },
  { key: 'status', header: 'Estado', render: (r) => <CashStatusBadge status={r.status} /> },
];

export function CashHistoryPage() {
  const registers = useCashStore((s) => s.registers);
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Historial de cajas"
        subtitle={`${registers.length} cajas registradas`}
        backTo={ROUTES.cash}
      />
      <Card>
        <DataTable
          columns={columns}
          rows={registers}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(ROUTES.cashDetail(r.id))}
          emptyState={
            <EmptyState
              icon={Wallet}
              title="No hay cajas registradas"
              description="Cuando abras y cierres cajas, el historial de arqueos va a aparecer acá."
            />
          }
        />
      </Card>
    </div>
  );
}
