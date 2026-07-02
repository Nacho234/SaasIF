import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Boxes,
  ClipboardList,
  Lock,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useCashStore, selectOpenRegister } from '@/store/cashStore';
import { useSalesStore } from '@/store/salesStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { getSalesMetrics, rangeFromPreset } from '@/services/reportService';
import { usePermissions } from '@/hooks/usePermissions';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { INVENTORY_IN_TYPES, INVENTORY_MOVEMENT_LABELS } from '@/constants/labels';
import { formatMoney, formatFriendlyDateTime, formatTime } from '@/utils/format';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SaleStatusBadge, CashMovementBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { OpenCashModal } from '@/components/cash/OpenCashModal';
import { CloseCashModal } from '@/components/cash/CloseCashModal';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { cn } from '@/utils/cn';

const QUICK_ACTIONS = [
  { label: 'Nueva venta', to: ROUTES.pos, icon: ShoppingCart, permission: 'sell' as const },
  { label: 'Productos', to: ROUTES.products, icon: Package },
  { label: 'Clientes', to: ROUTES.customers, icon: Users },
  { label: 'Stock', to: ROUTES.inventory, icon: Boxes, permission: 'adjust_stock' as const },
  { label: 'Reportes', to: ROUTES.reports, icon: BarChart3, permission: 'view_reports' as const },
  { label: 'Gastos', to: ROUTES.expenses, icon: Banknote, permission: 'register_expenses' as const },
  { label: 'Compras', to: ROUTES.purchases, icon: ClipboardList, permission: 'manage_purchases' as const },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)!;
  const { can } = usePermissions();
  const navigate = useNavigate();
  const openRegister = useCashStore((s) => selectOpenRegister(s));
  const registers = useCashStore((s) => s.registers);
  const cashMovements = useCashStore((s) => s.movements);
  const sales = useSalesStore((s) => s.sales);
  const products = useProductStore((s) => s.products);
  const customers = useCustomerStore((s) => s.customers);
  const invMovements = useInventoryStore((s) => s.movements);

  const [openCashModal, setOpenCashModal] = useState(false);
  const [closeCashModal, setCloseCashModal] = useState(false);

  const metrics = useMemo(() => getSalesMetrics(rangeFromPreset('today')), [sales]);

  const lowStock = products.filter((p) => p.isActive && p.stock > 0 && p.stock <= p.minStock);
  const outOfStock = products.filter((p) => p.isActive && p.stock <= 0);
  const debtors = customers.filter((c) => c.debtBalance > 0).sort((a, b) => b.debtBalance - a.debtBalance);
  const totalDebt = debtors.reduce((acc, c) => acc + c.debtBalance, 0);
  const lastSales = sales.slice(0, 6);
  const lastCashMovements = cashMovements.filter((m) => m.type !== 'closing').slice(0, 6);
  const lastInventory = invMovements.slice(0, 5);
  const recentDifferences = registers.filter((r) => r.status === 'closed_with_difference').slice(0, 1);
  const topProducts = metrics.byProduct.slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user.name.split(' ')[0];

  return (
    <div className="animate-fade-in">
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Este es el resumen de hoy en tu local.
          </p>
        </div>
        <div className="flex gap-2">
          {openRegister ? (
            <>
              {can('sell') && (
                <Button onClick={() => navigate(ROUTES.pos)}>
                  <Plus className="size-4" aria-hidden />
                  Nueva venta
                </Button>
              )}
              {can('close_cash') && (
                <Button variant="secondary" onClick={() => setCloseCashModal(true)}>
                  <Lock className="size-4" aria-hidden />
                  Cerrar caja
                </Button>
              )}
            </>
          ) : (
            can('open_cash') && (
              <Button onClick={() => setOpenCashModal(true)}>
                <Wallet className="size-4" aria-hidden />
                Abrir caja
              </Button>
            )
          )}
        </div>
      </div>

      {/* Alertas */}
      <div className="mb-5 flex flex-col gap-2">
        {!openRegister && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/50">
            <AlertTriangle className="size-5 shrink-0 text-amber-500" aria-hidden />
            <p className="flex-1 text-sm font-medium text-amber-900 dark:text-amber-200">
              La caja está cerrada. Para comenzar a vender, primero abrí la caja.
            </p>
            {can('open_cash') ? (
              <Button size="sm" onClick={() => setOpenCashModal(true)}>
                Abrir caja ahora
              </Button>
            ) : (
              <span className="text-xs text-amber-700 dark:text-amber-300">Pedile a un encargado que abra la caja.</span>
            )}
          </div>
        )}
        {outOfStock.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/50">
            <Package className="size-5 shrink-0 text-red-500" aria-hidden />
            <p className="flex-1 text-sm font-medium text-red-900 dark:text-red-200">
              {outOfStock.length} producto{outOfStock.length > 1 ? 's' : ''} sin stock.
            </p>
            <Link to={`${ROUTES.products}?stock=out`} className="text-xs font-semibold text-red-700 hover:underline dark:text-red-300">
              Ver productos →
            </Link>
          </div>
        )}
        {recentDifferences.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900 dark:bg-sky-950/50">
            <Wallet className="size-5 shrink-0 text-sky-500" aria-hidden />
            <p className="flex-1 text-sm font-medium text-sky-900 dark:text-sky-200">
              El cierre de {r.number} tuvo una diferencia de {formatMoney(r.difference ?? 0)}.
            </p>
            <Link to={ROUTES.cashDetail(r.id)} className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300">
              Ver detalle →
            </Link>
          </div>
        ))}
      </div>

      {/* Métricas del día */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ventas de hoy" value={formatMoney(metrics.total)} icon={TrendingUp} tone="primary" hint={`${metrics.count} ventas`} />
        <StatCard label="Ticket promedio" value={formatMoney(metrics.avgTicket)} icon={Receipt} />
        <StatCard
          label="Ganancia neta de hoy"
          value={formatMoney(metrics.netProfit)}
          icon={ArrowUpRight}
          tone={metrics.netProfit >= 0 ? 'success' : 'danger'}
          hint={`Bruta ${formatMoney(metrics.profit)} · ${metrics.marginPercent}% margen`}
        />
        <StatCard
          label="Estado de caja"
          value={openRegister ? 'Abierta' : 'Cerrada'}
          icon={Wallet}
          tone={openRegister ? 'success' : 'warning'}
          hint={openRegister ? `Desde ${formatTime(openRegister.openedAt)} · ${openRegister.openedByName}` : 'Sin caja activa'}
        />
      </div>

      {/* Totales por método + accesos rápidos */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cobros de hoy por método" subtitle="Incluye solo ventas no anuladas" />
          <CardBody>
            {Object.keys(metrics.byMethod).length === 0 ? (
              <EmptyState icon={Banknote} title="Todavía no hay cobros hoy" description="Cuando registres ventas vas a ver acá el desglose por método de pago." className="py-6" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(metrics.byMethod).map(([method, amount]) => (
                  <div key={method} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS]}
                    </p>
                    <p className="font-display text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
                      {formatMoney(amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Accesos rápidos" />
          <CardBody>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.filter((a) => !a.permission || can(a.permission)).map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-slate-100 p-3 text-center transition-colors hover:border-primary-200 hover:bg-primary-50 dark:border-slate-800 dark:hover:border-primary-800 dark:hover:bg-primary-950"
                >
                  <action.icon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Últimas ventas */}
        <Card>
          <CardHeader
            title="Últimas ventas"
            action={<Link to={ROUTES.sales} className="text-xs font-semibold text-primary-600 hover:underline">Ver todas</Link>}
          />
          <CardBody className="px-2">
            {lastSales.length === 0 ? (
              <EmptyState icon={Receipt} title="No hay ventas todavía" description="Abrí la caja y registrá tu primera venta desde el POS." className="py-6" />
            ) : (
              <ul className="flex flex-col">
                {lastSales.map((sale) => (
                  <li key={sale.id}>
                    <Link
                      to={ROUTES.saleDetail(sale.id)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <Receipt className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {sale.saleNumber} · {sale.customerName ?? 'Consumidor final'}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {formatFriendlyDateTime(sale.date)} · {sale.sellerName}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-bold text-slate-900 tabular-nums dark:text-slate-100">
                          {formatMoney(sale.total)}
                        </span>
                        <SaleStatusBadge status={sale.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Productos más vendidos hoy */}
        <Card>
          <CardHeader title="Más vendidos hoy" subtitle="Por facturación" />
          <CardBody>
            {topProducts.length === 0 ? (
              <EmptyState icon={TrendingUp} title="Sin datos por ahora" description="Los productos más vendidos del día van a aparecer acá." className="py-6" />
            ) : (
              <SimpleBarChart data={topProducts.map((p) => ({ label: p.name, value: p.total, hint: `${p.quantity} u.` }))} />
            )}
          </CardBody>
        </Card>

        {/* Movimientos de caja */}
        <Card>
          <CardHeader
            title="Últimos movimientos de caja"
            action={<Link to={ROUTES.cash} className="text-xs font-semibold text-primary-600 hover:underline">Ir a caja</Link>}
          />
          <CardBody className="px-2">
            {lastCashMovements.length === 0 ? (
              <EmptyState icon={Wallet} title="No hay movimientos de caja" className="py-6" />
            ) : (
              <ul className="flex flex-col">
                {lastCashMovements.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg',
                        m.direction === 'in'
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
                      )}
                    >
                      {m.direction === 'in' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{m.reason}</span>
                      <span className="block text-xs text-slate-500">{formatFriendlyDateTime(m.date)} · {m.userName}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          m.direction === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                        )}
                      >
                        {m.direction === 'in' ? '+' : '−'}{formatMoney(m.amount)}
                      </span>
                      <CashMovementBadge type={m.type} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Stock y deudas */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Alertas de stock"
              subtitle={`${lowStock.length} bajo stock · ${outOfStock.length} sin stock`}
              action={<Link to={ROUTES.products} className="text-xs font-semibold text-primary-600 hover:underline">Ver productos</Link>}
            />
            <CardBody className="px-2">
              {lowStock.length === 0 && outOfStock.length === 0 ? (
                <EmptyState icon={Boxes} title="Stock saludable" description="No hay productos bajo el mínimo." className="py-4" />
              ) : (
                <ul className="flex flex-col">
                  {[...outOfStock, ...lowStock].slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <Link to={ROUTES.productDetail(p.id)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                        <Badge variant={p.stock <= 0 ? 'danger' : 'warning'}>
                          {p.stock <= 0 ? 'Sin stock' : `${p.stock} u.`}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Clientes con deuda"
              subtitle={debtors.length ? `Total adeudado: ${formatMoney(totalDebt)}` : undefined}
              action={<Link to={ROUTES.customers} className="text-xs font-semibold text-primary-600 hover:underline">Ver clientes</Link>}
            />
            <CardBody className="px-2">
              {debtors.length === 0 ? (
                <EmptyState icon={Users} title="Nadie debe nada" description="No hay cuentas corrientes pendientes." className="py-4" />
              ) : (
                <ul className="flex flex-col">
                  {debtors.slice(0, 4).map((c) => (
                    <li key={c.id}>
                      <Link to={ROUTES.customerDetail(c.id)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                        <span className="text-sm font-bold text-amber-600 tabular-nums dark:text-amber-400">{formatMoney(c.debtBalance)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Últimos movimientos de inventario */}
      <Card className="mt-4">
        <CardHeader
          title="Últimos movimientos de inventario"
          action={can('adjust_stock') ? <Link to={ROUTES.inventoryMovements} className="text-xs font-semibold text-primary-600 hover:underline">Ver todos</Link> : undefined}
        />
        <CardBody className="px-2">
          {lastInventory.length === 0 ? (
            <EmptyState icon={Boxes} title="No hay movimientos de stock" className="py-4" />
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
              {lastInventory.map((m) => (
                <li key={m.id} className="rounded-xl px-3 py-2">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{m.productName}</p>
                  <p className="text-xs text-slate-500">
                    {INVENTORY_MOVEMENT_LABELS[m.type]} ·{' '}
                    <span className={cn('font-semibold', INVENTORY_IN_TYPES.includes(m.type) ? 'text-emerald-600' : 'text-red-500')}>
                      {INVENTORY_IN_TYPES.includes(m.type) ? '+' : '−'}{m.quantity}
                    </span>{' '}
                    → {m.newStock} u.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <OpenCashModal open={openCashModal} onClose={() => setOpenCashModal(false)} />
      {openRegister && (
        <CloseCashModal open={closeCashModal} onClose={() => setCloseCashModal(false)} register={openRegister} />
      )}
    </div>
  );
}
