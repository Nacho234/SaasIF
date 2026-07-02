import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Banknote, History, Lock, Plus, Receipt, Wallet } from 'lucide-react';
import { useCashStore, selectOpenRegister } from '@/store/cashStore';
import { getRegisterSummary } from '@/services/cashRegisterService';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatFriendlyDateTime, formatMoney } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { CashMovementBadge, CashStatusBadge } from '@/components/ui/StatusBadge';
import { OpenCashModal } from '@/components/cash/OpenCashModal';
import { CloseCashModal } from '@/components/cash/CloseCashModal';
import { CashMovementModal } from '@/components/cash/CashMovementModal';
import type { CashMovement } from '@/types';
import { cn } from '@/utils/cn';

const movementColumns: Column<CashMovement>[] = [
  {
    key: 'date',
    header: 'Fecha',
    render: (m) => <span className="text-xs text-slate-500">{formatFriendlyDateTime(m.date)}</span>,
  },
  { key: 'type', header: 'Tipo', render: (m) => <CashMovementBadge type={m.type} /> },
  {
    key: 'reason',
    header: 'Detalle',
    render: (m) => (
      <div>
        <p className="font-medium">{m.reason}</p>
        {m.notes && <p className="text-xs text-slate-400">{m.notes}</p>}
      </div>
    ),
  },
  { key: 'method', header: 'Método', hideOnMobile: true, render: (m) => PAYMENT_METHOD_LABELS[m.method] },
  { key: 'user', header: 'Usuario', hideOnMobile: true, render: (m) => m.userName },
  {
    key: 'amount',
    header: 'Monto',
    align: 'right',
    render: (m) => (
      <span
        className={cn(
          'font-bold tabular-nums',
          m.type === 'closing' ? 'text-slate-400' : m.direction === 'in' ? 'text-emerald-600' : 'text-red-500',
        )}
      >
        {m.type === 'closing' ? '—' : `${m.direction === 'in' ? '+' : '−'}${formatCurrency(m.amount)}`}
      </span>
    ),
  },
];

export function CashRegisterPage() {
  const { can } = usePermissions();
  const openRegister = useCashStore((s) => selectOpenRegister(s));
  const movements = useCashStore((s) => s.movements);
  const lastClosed = useCashStore((s) => s.registers.find((r) => r.status !== 'open'));

  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);

  const summary = useMemo(
    () => (openRegister ? getRegisterSummary(openRegister.id) : null),
    [openRegister, movements],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Caja"
        subtitle={
          openRegister
            ? `${openRegister.number} · abierta ${formatFriendlyDateTime(openRegister.openedAt)} por ${openRegister.openedByName}`
            : 'No hay ninguna caja abierta en este momento'
        }
        actions={
          <>
            <Link to={ROUTES.cashHistory}>
              <Button variant="secondary">
                <History className="size-4" aria-hidden />
                Historial
              </Button>
            </Link>
            {openRegister ? (
              <>
                <Button variant="secondary" onClick={() => setMovementModal(true)}>
                  <Plus className="size-4" aria-hidden />
                  Movimiento
                </Button>
                {can('close_cash') && (
                  <Button variant="danger" onClick={() => setCloseModal(true)}>
                    <Lock className="size-4" aria-hidden />
                    Cerrar caja
                  </Button>
                )}
              </>
            ) : (
              can('open_cash') && (
                <Button onClick={() => setOpenModal(true)}>
                  <Wallet className="size-4" aria-hidden />
                  Abrir caja
                </Button>
              )
            )}
          </>
        }
      />

      {openRegister && summary ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Efectivo esperado" value={formatMoney(summary.expectedCash)} icon={Banknote} tone="primary" hint={`Inicial: ${formatMoney(openRegister.openingAmount)}`} />
            <StatCard label="Ventas del turno" value={formatMoney(summary.salesTotal)} icon={Receipt} tone="success" hint={`${summary.salesCount} ventas`} />
            <StatCard label="Ingresos" value={formatMoney(summary.totalIn)} icon={ArrowUpRight} />
            <StatCard label="Egresos" value={formatMoney(summary.totalOut)} icon={ArrowDownRight} tone="danger" hint={`Gastos ${formatMoney(summary.expensesTotal)} · Retiros ${formatMoney(summary.withdrawals)}`} />
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Cobros por método (ventas del turno)" />
              <CardBody>
                {Object.keys(summary.salesByMethod).length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">Todavía no hay ventas en este turno.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(summary.salesByMethod).map(([method, amount]) => (
                      <div key={method} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                        <p className="text-xs text-slate-500">{PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS]}</p>
                        <p className="font-display text-base font-bold tabular-nums">{formatMoney(amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Otros movimientos" />
              <CardBody>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Ingresos manuales</dt><dd className="font-semibold tabular-nums">{formatCurrency(summary.manualIncome)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Pagos de deuda</dt><dd className="font-semibold tabular-nums">{formatCurrency(summary.debtPayments)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Gastos</dt><dd className="font-semibold text-red-500 tabular-nums">−{formatCurrency(summary.expensesTotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Retiros</dt><dd className="font-semibold text-red-500 tabular-nums">−{formatCurrency(summary.withdrawals)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Devoluciones</dt><dd className="font-semibold text-red-500 tabular-nums">−{formatCurrency(summary.refunds)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Anulaciones</dt><dd className="font-semibold text-red-500 tabular-nums">−{formatCurrency(summary.cancellations)}</dd></div>
                </dl>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Movimientos del turno" subtitle={`${summary.movements.length} movimientos`} />
            <DataTable
              columns={movementColumns}
              rows={[...summary.movements].reverse()}
              rowKey={(m) => m.id}
              emptyState={<EmptyState icon={Wallet} title="No hay movimientos de caja" />}
            />
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            icon={Wallet}
            title="La caja está cerrada"
            description={
              can('open_cash')
                ? 'Abrí la caja con el efectivo inicial para empezar a vender y registrar movimientos.'
                : 'Pedile a un encargado o administrador que abra la caja para poder vender.'
            }
            action={
              can('open_cash') && (
                <Button size="lg" onClick={() => setOpenModal(true)}>
                  <Wallet className="size-5" aria-hidden />
                  Abrir caja ahora
                </Button>
              )
            }
          />
          {lastClosed && (
            <CardBody className="border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Último cierre: {lastClosed.number}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lastClosed.closedAt ? formatFriendlyDateTime(lastClosed.closedAt) : ''} · Contado:{' '}
                    {formatCurrency(lastClosed.countedCash ?? 0)} · Diferencia: {formatCurrency(lastClosed.difference ?? 0)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CashStatusBadge status={lastClosed.status} />
                  <Link to={ROUTES.cashDetail(lastClosed.id)} className="text-xs font-semibold text-primary-600 hover:underline">
                    Ver detalle →
                  </Link>
                </div>
              </div>
            </CardBody>
          )}
        </Card>
      )}

      <OpenCashModal open={openModal} onClose={() => setOpenModal(false)} />
      {openRegister && <CloseCashModal open={closeModal} onClose={() => setCloseModal(false)} register={openRegister} />}
      <CashMovementModal open={movementModal} onClose={() => setMovementModal(false)} />
    </div>
  );
}
