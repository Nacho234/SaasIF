import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banknote, Receipt, Wallet } from 'lucide-react';
import { useCashStore } from '@/store/cashStore';
import { useSalesStore } from '@/store/salesStore';
import { getRegisterSummary } from '@/services/cashRegisterService';
import { formatCurrency, formatFriendlyDateTime, formatMoney } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { CashMovementBadge, CashStatusBadge, SaleStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CashMovement, Sale } from '@/types';
import { cn } from '@/utils/cn';

export function CashDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const register = useCashStore((s) => s.registers.find((r) => r.id === id));
  const movements = useCashStore((s) => s.movements);
  const allSales = useSalesStore((s) => s.sales);
  const sales = useMemo(() => allSales.filter((x) => x.cashRegisterId === id), [allSales, id]);

  const summary = useMemo(() => (register ? getRegisterSummary(register.id) : null), [register, movements]);

  if (!register || !summary) {
    return (
      <EmptyState
        icon={Wallet}
        title="Caja no encontrada"
        description="El arqueo que buscás no existe."
      />
    );
  }

  const movementColumns: Column<CashMovement>[] = [
    { key: 'date', header: 'Fecha', render: (m) => <span className="text-xs text-slate-500">{formatFriendlyDateTime(m.date)}</span> },
    { key: 'type', header: 'Tipo', render: (m) => <CashMovementBadge type={m.type} /> },
    { key: 'reason', header: 'Detalle', render: (m) => m.reason },
    { key: 'method', header: 'Método', hideOnMobile: true, render: (m) => PAYMENT_METHOD_LABELS[m.method] },
    { key: 'user', header: 'Usuario', hideOnMobile: true, render: (m) => m.userName },
    {
      key: 'amount',
      header: 'Monto',
      align: 'right',
      render: (m) => (
        <span className={cn('font-bold tabular-nums', m.type === 'closing' ? 'text-slate-400' : m.direction === 'in' ? 'text-emerald-600' : 'text-red-500')}>
          {m.type === 'closing' ? '—' : `${m.direction === 'in' ? '+' : '−'}${formatCurrency(m.amount)}`}
        </span>
      ),
    },
  ];

  const saleColumns: Column<Sale>[] = [
    { key: 'number', header: 'Venta', render: (s) => <span className="font-semibold">{s.saleNumber}</span> },
    { key: 'date', header: 'Fecha', render: (s) => <span className="text-xs text-slate-500">{formatFriendlyDateTime(s.date)}</span> },
    { key: 'customer', header: 'Cliente', hideOnMobile: true, render: (s) => s.customerName ?? 'Consumidor final' },
    { key: 'seller', header: 'Vendedor', hideOnMobile: true, render: (s) => s.sellerName },
    { key: 'status', header: 'Estado', render: (s) => <SaleStatusBadge status={s.status} /> },
    { key: 'total', header: 'Total', align: 'right', render: (s) => <span className="font-bold tabular-nums">{formatCurrency(s.total)}</span> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Caja ${register.number}`}
        subtitle={`Abierta ${formatFriendlyDateTime(register.openedAt)} por ${register.openedByName}${register.closedAt ? ` · cerrada ${formatFriendlyDateTime(register.closedAt)} por ${register.closedByName}` : ''}`}
        backTo={ROUTES.cashHistory}
        actions={<CashStatusBadge status={register.status} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monto inicial" value={formatMoney(register.openingAmount)} icon={Wallet} />
        <StatCard label="Ventas" value={formatMoney(summary.salesTotal)} icon={Receipt} tone="primary" hint={`${summary.salesCount} ventas`} />
        <StatCard
          label="Efectivo esperado"
          value={formatMoney(register.expectedCash ?? summary.expectedCash)}
          icon={Banknote}
          hint={register.countedCash != null ? `Contado: ${formatMoney(register.countedCash)}` : 'Caja aún abierta'}
        />
        <StatCard
          label="Diferencia"
          value={register.difference != null ? formatCurrency(register.difference) : '—'}
          icon={Banknote}
          tone={register.difference === 0 ? 'success' : register.difference != null ? 'warning' : 'default'}
        />
      </div>

      {(register.openingNotes || register.closingNotes) && (
        <Card className="mb-4">
          <CardBody className="pt-4 text-sm text-slate-600 dark:text-slate-300">
            {register.openingNotes && <p><strong>Apertura:</strong> {register.openingNotes}</p>}
            {register.closingNotes && <p><strong>Cierre:</strong> {register.closingNotes}</p>}
          </CardBody>
        </Card>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Cobros por método" />
          <CardBody>
            <dl className="flex flex-col gap-2 text-sm">
              {Object.entries(summary.salesByMethod).map(([method, amount]) => (
                <div key={method} className="flex justify-between">
                  <dt className="text-slate-500">{PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS]}</dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(amount)}</dd>
                </div>
              ))}
              {Object.keys(summary.salesByMethod).length === 0 && <p className="text-slate-400">Sin ventas.</p>}
            </dl>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Resumen de egresos" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Gastos', value: summary.expensesTotal },
                { label: 'Retiros', value: summary.withdrawals },
                { label: 'Devoluciones', value: summary.refunds },
                { label: 'Anulaciones', value: summary.cancellations },
              ].map((x) => (
                <div key={x.label} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500">{x.label}</p>
                  <p className="font-display text-base font-bold text-red-500 tabular-nums">−{formatMoney(x.value)}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader title="Ventas asociadas" subtitle={`${sales.length} ventas en este turno`} />
        <DataTable
          columns={saleColumns}
          rows={sales}
          rowKey={(s) => s.id}
          onRowClick={(s) => navigate(ROUTES.saleDetail(s.id))}
          emptyState={<EmptyState icon={Receipt} title="No hubo ventas en este turno" />}
        />
      </Card>

      <Card>
        <CardHeader title="Movimientos" />
        <DataTable
          columns={movementColumns}
          rows={[...summary.movements].reverse()}
          rowKey={(m) => m.id}
          emptyState={<EmptyState icon={Wallet} title="Sin movimientos" />}
        />
      </Card>
    </div>
  );
}
