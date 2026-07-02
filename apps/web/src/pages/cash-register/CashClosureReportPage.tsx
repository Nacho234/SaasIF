import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, History, Printer, Store, Wallet } from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';
import { getLatestClosure } from '@/services/cashClosureService';
import { logAudit } from '@/services/auditService';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { PROCESSOR_LABELS, CASH_STATUS_LABELS } from '@/constants/labels';
import type { PaymentMethodId } from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';

function Row({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'ok' | 'warn' }) {
  return (
    <div className="flex justify-between border-b border-dashed border-slate-200 py-1 text-sm last:border-0 dark:border-slate-700">
      <span className="text-slate-500">{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          tone === 'danger' && 'text-red-500',
          tone === 'ok' && 'text-emerald-600',
          tone === 'warn' && 'text-amber-600',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 border-b-2 border-slate-800 pb-1 font-display text-sm font-bold tracking-wide text-slate-800 uppercase dark:border-slate-200 dark:text-slate-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CashClosureReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const settings = useBusinessStore((s) => s.settings);
  const closure = getLatestClosure(id ?? '');

  if (!closure) {
    return (
      <EmptyState
        icon={FileText}
        title="No hay hoja de cierre"
        description="Esta caja todavía no se cerró o no tiene un cierre registrado."
        action={<Button onClick={() => navigate(ROUTES.cashHistory)}>Ir al historial</Button>}
      />
    );
  }

  const print = () => {
    logAudit({ action: 'cash_closure_printed', module: 'cash', description: `Imprimió la hoja de cierre de ${closure.registerNumber}` });
    window.print();
  };

  const cashSales = closure.salesByMethod.cash ?? 0;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Hoja de Cierre Diario</h1>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            closure.status === 'closed'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
          )}
        >
          {CASH_STATUS_LABELS[closure.status]}
        </span>
      </div>

      {/* Hoja imprimible */}
      <div className="print-area rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-900">
        {/* Encabezado */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          {settings.logo ? (
            <img src={settings.logo} alt="" className="size-12 rounded-xl object-cover" />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Store className="size-6" />
            </span>
          )}
          <div className="flex-1">
            <p className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">{settings.businessName}</p>
            {settings.address && <p className="text-xs text-slate-500">{settings.address}</p>}
            {settings.cuit && <p className="text-xs text-slate-500">CUIT: {settings.cuit}</p>}
          </div>
          <div className="text-right">
            <p className="font-display text-base font-bold">{closure.registerNumber}</p>
            <p className="text-xs text-slate-400">Cierre v{closure.version}</p>
          </div>
        </div>

        <Section title="Datos generales">
          <Row label="Apertura" value={formatDateTime(closure.openedAt)} />
          <Row label="Abrió" value={closure.openedByName} />
          <Row label="Cierre" value={formatDateTime(closure.closedAt)} />
          <Row label="Cerró" value={closure.closedByName} />
          <Row label="Estado" value={CASH_STATUS_LABELS[closure.status]} tone={closure.status === 'closed' ? 'ok' : 'warn'} />
        </Section>

        <Section title="Resumen de ventas">
          <Row label="Cantidad de ventas" value={String(closure.salesCount)} />
          <Row label="Total vendido" value={formatCurrency(closure.salesTotal)} />
          <Row label="Tickets internos (no fiscal)" value={formatCurrency(closure.internalTicketsTotal)} />
          {settings.showFiscalSummary && (
            <Row label="Facturado fiscalmente (ARCA no conectado)" value={formatCurrency(closure.fiscalInvoicesTotal)} />
          )}
          <Row label="Devoluciones" value={formatCurrency(closure.refunds)} tone={closure.refunds > 0 ? 'danger' : undefined} />
          <Row label="Anulaciones" value={formatCurrency(closure.cancellations)} tone={closure.cancellations > 0 ? 'danger' : undefined} />
        </Section>

        <Section title="Resumen por medio de pago">
          {Object.keys(closure.salesByMethod).length === 0 ? (
            <p className="py-1 text-sm text-slate-400">Sin cobros en el turno.</p>
          ) : (
            (Object.entries(closure.salesByMethod) as [PaymentMethodId, number][]).map(([method, amount]) => (
              <Row key={method} label={PAYMENT_METHOD_LABELS[method]} value={formatCurrency(amount)} />
            ))
          )}
        </Section>

        <Section title="Resumen de efectivo">
          <Row label="Monto inicial" value={formatCurrency(closure.openingAmount)} />
          <Row label="Ventas en efectivo" value={formatCurrency(cashSales)} />
          <Row label="Ingresos manuales" value={formatCurrency(closure.manualIncome)} />
          <Row label="Pagos de deuda" value={formatCurrency(closure.debtPayments)} />
          <Row label="Gastos y egresos" value={`-${formatCurrency(closure.expensesTotal)}`} tone="danger" />
          <Row label="Retiros" value={`-${formatCurrency(closure.withdrawals)}`} tone="danger" />
          <Row label="Efectivo esperado" value={formatCurrency(closure.expectedCash)} />
          <Row label="Efectivo contado" value={formatCurrency(closure.countedCash)} />
          <Row
            label="Diferencia"
            value={`${closure.cashDifference > 0 ? '+' : ''}${formatCurrency(closure.cashDifference)}`}
            tone={closure.cashDifference === 0 ? 'ok' : 'warn'}
          />
        </Section>

        {closure.terminalClosures.length > 0 && (
          <Section title="Cierre de terminales">
            {closure.terminalClosures.map((t) => (
              <div key={t.id} className="border-b border-dashed border-slate-200 py-2 text-sm last:border-0 dark:border-slate-700">
                <div className="flex justify-between font-semibold">
                  <span>{PROCESSOR_LABELS[t.processor]} · {t.terminalLabel}</span>
                  <span className={cn('tabular-nums', t.totalDifference === 0 ? 'text-emerald-600' : 'text-amber-600')}>
                    {t.totalDifference > 0 ? '+' : ''}
                    {formatCurrency(t.totalDifference)}
                  </span>
                </div>
                <div className="mt-0.5 flex justify-between text-xs text-slate-500">
                  <span>Sistema {formatCurrency(t.totalSystem)} · Terminal {formatCurrency(t.totalTerminal)}</span>
                  {t.batchNumber && <span>Lote {t.batchNumber}</span>}
                </div>
                {t.notes && <p className="text-xs text-slate-400">Obs: {t.notes}</p>}
              </div>
            ))}
          </Section>
        )}

        {settings.showStockSummary && (
          <Section title="Movimientos de stock">
            <Row label="Unidades vendidas" value={String(closure.unitsSold)} />
            <Row label="Productos distintos vendidos" value={String(closure.productsSoldCount)} />
            <Row label="Movimientos de inventario del turno" value={String(closure.inventoryMovementsCount)} />
          </Section>
        )}

        {closure.paymentVerifications.length > 0 && (
          <Section title="Verificación de medios">
            {closure.paymentVerifications.map((v) => (
              <Row
                key={v.method}
                label={PAYMENT_METHOD_LABELS[v.method]}
                value={v.verified ? 'Verificado ✓' : 'Sin verificar'}
                tone={v.verified ? 'ok' : 'warn'}
              />
            ))}
          </Section>
        )}

        {closure.notes && (
          <Section title="Observaciones">
            <p className="text-sm text-slate-600 dark:text-slate-300">{closure.notes}</p>
          </Section>
        )}

        {(closure.employeeSignature || closure.managerSignature) && (
          <Section title="Firmas">
            <div className="mt-2 grid grid-cols-2 gap-6 text-center text-sm">
              {closure.employeeSignature && (
                <div>
                  <p className="border-t border-slate-400 pt-1 font-medium">{closure.employeeSignature}</p>
                  <p className="text-xs text-slate-400">Empleado</p>
                </div>
              )}
              {closure.managerSignature && (
                <div>
                  <p className="border-t border-slate-400 pt-1 font-medium">{closure.managerSignature}</p>
                  <p className="text-xs text-slate-400">Encargado</p>
                </div>
              )}
            </div>
          </Section>
        )}

        <p className="mt-6 border-t border-dashed border-slate-200 pt-3 text-center text-[10px] tracking-wide text-slate-400 uppercase dark:border-slate-700">
          Documento interno de control · no válido como comprobante fiscal
        </p>
      </div>

      {/* Acciones (fuera del área imprimible) */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="secondary" onClick={print}>
          <Printer className="size-4" aria-hidden />
          Imprimir
        </Button>
        <Link to={ROUTES.cashDetail(closure.cashRegisterId)}>
          <Button variant="secondary" fullWidth>
            <Wallet className="size-4" aria-hidden />
            Ver caja
          </Button>
        </Link>
        <Link to={ROUTES.cashHistory}>
          <Button variant="secondary" fullWidth>
            <History className="size-4" aria-hidden />
            Historial
          </Button>
        </Link>
        <Button onClick={() => navigate(ROUTES.cash)}>
          <Wallet className="size-4" aria-hidden />
          Abrir nueva caja
        </Button>
      </div>
    </div>
  );
}
