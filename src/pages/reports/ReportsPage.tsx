import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download, PiggyBank, Printer, Receipt, RotateCcw, ShoppingCart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useSalesStore } from '@/store/salesStore';
import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useCashStore } from '@/store/cashStore';
import { getExpensesInRange, getSalesMetrics, rangeFromPreset, type RangePreset } from '@/services/reportService';
import { toast } from '@/store/uiStore';
import { formatCurrency, formatMoney, formatPercent } from '@/utils/format';
import { round2 } from '@/utils/calc';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { EXPENSE_CATEGORY_LABELS } from '@/constants/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { CashStatusBadge } from '@/components/ui/StatusBadge';
import { formatFriendlyDateTime } from '@/utils/format';

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'last30', label: 'Últimos 30 días' },
];

export function ReportsPage() {
  const [preset, setPreset] = useState<RangePreset>('last30');
  const sales = useSalesStore((s) => s.sales);
  const returns = useSalesStore((s) => s.returns);
  const products = useProductStore((s) => s.products);
  const customers = useCustomerStore((s) => s.customers);
  const registers = useCashStore((s) => s.registers);

  const range = useMemo(() => rangeFromPreset(preset), [preset]);
  const metrics = useMemo(() => getSalesMetrics(range), [range, sales]);
  const expenses = useMemo(() => getExpensesInRange(range), [range]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const label = EXPENSE_CATEGORY_LABELS[e.category];
      map.set(label, round2((map.get(label) ?? 0) + e.amount));
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const cancelled = sales.filter((s) => s.status === 'cancelled').length;
  const lowStock = products.filter((p) => p.isActive && p.stock > 0 && p.stock <= p.minStock).length;
  const outStock = products.filter((p) => p.isActive && p.stock <= 0).length;
  const debtors = customers.filter((c) => c.debtBalance > 0);
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; id: string; total: number }>();
    for (const sale of sales.filter((s) => s.status !== 'cancelled' && s.customerId)) {
      const entry = map.get(sale.customerId!) ?? { name: sale.customerName ?? '', id: sale.customerId!, total: 0 };
      entry.total = round2(entry.total + sale.total);
      map.set(sale.customerId!, entry);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [sales]);
  const closuresWithDifference = registers.filter((r) => r.status === 'closed_with_difference');

  const simulate = (action: string) => toast.info(`${action} simulada`, 'En la versión completa se genera el archivo real.');

  const hasData = metrics.count > 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reportes"
        subtitle="Métricas calculadas sobre los datos locales"
        actions={
          <>
            <Button variant="secondary" onClick={() => simulate('Exportación')}>
              <Download className="size-4" aria-hidden />
              Exportar
            </Button>
            <Button variant="secondary" onClick={() => simulate('Impresión')}>
              <Printer className="size-4" aria-hidden />
              Imprimir
            </Button>
            <Button variant="ghost" onClick={() => setPreset('last30')} aria-label="Reset filtros">
              <RotateCcw className="size-4" aria-hidden />
            </Button>
          </>
        }
      />

      <Tabs className="mb-4" tabs={PRESETS.map((p) => ({ id: p.id, label: p.label }))} active={preset} onChange={(id) => setPreset(id as RangePreset)} />

      {/* Métricas principales */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Ventas totales" value={formatMoney(metrics.total)} icon={TrendingUp} tone="primary" hint={`${metrics.count} ventas`} />
        <StatCard label="Ticket promedio" value={formatMoney(metrics.avgTicket)} icon={Receipt} />
        <StatCard label="Ganancia bruta" value={formatMoney(metrics.profit)} icon={TrendingUp} tone="success" hint={`Margen ${formatPercent(metrics.marginPercent)}`} />
        <StatCard label="Gastos del período" value={formatMoney(metrics.expensesTotal)} icon={TrendingDown} tone="danger" />
        <StatCard
          label="Ganancia neta"
          value={formatMoney(metrics.netProfit)}
          icon={PiggyBank}
          tone={metrics.netProfit >= 0 ? 'success' : 'danger'}
          hint="Bruta − gastos"
        />
        <StatCard label="Compras del período" value={formatMoney(metrics.purchasesTotal)} icon={ShoppingCart} hint="Mercadería recibida" />
      </div>

      {!hasData ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No hay reportes para este período"
            description="Probá con otro rango de fechas o registrá ventas para ver las métricas."
          />
        </Card>
      ) : (
        <>
          {/* Evolución de ventas */}
          <Card className="mb-4">
            <CardHeader title="Evolución de ventas" subtitle="Facturación por día" />
            <CardBody>
              <SimpleLineChart data={metrics.byDay.map((d) => ({ label: d.label, value: d.total }))} />
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Ventas por método de pago" />
              <CardBody>
                <SimpleBarChart
                  data={Object.entries(metrics.byMethod).map(([method, value]) => ({
                    label: PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS],
                    value,
                  }))}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Ventas por vendedor" />
              <CardBody>
                <SimpleBarChart data={metrics.bySeller.map((s) => ({ label: s.name, value: s.total, hint: `${s.count} ventas` }))} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Ventas por categoría" subtitle="Con margen de ganancia" />
              <CardBody>
                <SimpleBarChart
                  data={metrics.byCategory.slice(0, 8).map((c) => ({
                    label: c.name,
                    value: c.total,
                    hint: `${formatPercent(c.marginPercent)} margen`,
                  }))}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Productos más vendidos" subtitle="Por facturación" />
              <CardBody>
                <SimpleBarChart data={metrics.byProduct.slice(0, 8).map((p) => ({ label: p.name, value: p.total, hint: `${p.quantity} u.` }))} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Productos menos vendidos" subtitle="Dentro de los vendidos en el período" />
              <CardBody>
                <SimpleBarChart data={[...metrics.byProduct].reverse().slice(0, 5).map((p) => ({ label: p.name, value: p.total, hint: `${p.quantity} u.` }))} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Gastos por categoría" />
              <CardBody>
                {expensesByCategory.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">Sin gastos en el período.</p>
                ) : (
                  <SimpleBarChart data={expensesByCategory} />
                )}
              </CardBody>
            </Card>
          </div>

          {/* Rentabilidad por producto */}
          <Card className="mt-4">
            <CardHeader title="Rentabilidad por producto" subtitle="Ganancia y margen real según costo · ordenado por ganancia" />
            <CardBody className="overflow-x-auto px-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="px-4 py-2 font-semibold">Producto</th>
                    <th className="px-4 py-2 text-right font-semibold">Unidades</th>
                    <th className="px-4 py-2 text-right font-semibold">Facturación</th>
                    <th className="px-4 py-2 text-right font-semibold">Costo</th>
                    <th className="px-4 py-2 text-right font-semibold">Ganancia</th>
                    <th className="px-4 py-2 text-right font-semibold">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {[...metrics.byProduct]
                    .sort((a, b) => b.profit - a.profit)
                    .slice(0, 12)
                    .map((p) => (
                      <tr key={p.productId} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                        <td className="truncate px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{p.quantity}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(p.total)}</td>
                        <td className="px-4 py-2 text-right text-slate-500 tabular-nums">{formatMoney(p.cost)}</td>
                        <td className={`px-4 py-2 text-right font-bold tabular-nums ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatMoney(p.profit)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                              p.marginPercent >= 30
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : p.marginPercent >= 15
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                  : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                            }`}
                          >
                            {formatPercent(p.marginPercent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {/* Otros indicadores */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Clientes que más compran" subtitle="Histórico" />
              <CardBody className="px-2">
                <ul className="flex flex-col">
                  {topCustomers.map((c) => (
                    <li key={c.id}>
                      <Link to={ROUTES.customerDetail(c.id)} className="flex justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="font-bold tabular-nums">{formatMoney(c.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Clientes con deuda" subtitle={`Total: ${formatMoney(debtors.reduce((a, c) => a + c.debtBalance, 0))}`} />
              <CardBody className="px-2">
                {debtors.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">Sin deudas pendientes.</p>
                ) : (
                  <ul className="flex flex-col">
                    {debtors.map((c) => (
                      <li key={c.id}>
                        <Link to={ROUTES.customerDetail(c.id)} className="flex justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <span className="truncate font-medium">{c.name}</span>
                          <span className="font-bold text-amber-600 tabular-nums">{formatMoney(c.debtBalance)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Control" />
              <CardBody>
                <dl className="flex flex-col gap-2.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Ventas anuladas (histórico)</dt><dd className="font-bold tabular-nums">{cancelled}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Devoluciones (histórico)</dt><dd className="font-bold tabular-nums">{returns.length}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Productos bajo stock</dt><dd className="font-bold text-amber-600 tabular-nums">{lowStock}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Productos sin stock</dt><dd className="font-bold text-red-500 tabular-nums">{outStock}</dd></div>
                </dl>
              </CardBody>
            </Card>
          </div>

          {/* Cierres con diferencia */}
          <Card className="mt-4">
            <CardHeader title="Cierres de caja con diferencia" action={<Wallet className="size-4 text-slate-300" aria-hidden />} />
            <CardBody className="px-2">
              {closuresWithDifference.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No hay cierres con diferencia. ¡Buen control de caja!</p>
              ) : (
                <ul className="flex flex-col">
                  {closuresWithDifference.map((r) => (
                    <li key={r.id}>
                      <Link to={ROUTES.cashDetail(r.id)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span>
                          <span className="block text-sm font-semibold">{r.number}</span>
                          <span className="block text-xs text-slate-400">{r.closedAt ? formatFriendlyDateTime(r.closedAt) : ''} · {r.closedByName}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <CashStatusBadge status={r.status} />
                          <span className="font-bold text-amber-600 tabular-nums">{formatCurrency(r.difference ?? 0)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
