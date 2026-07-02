import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Search } from 'lucide-react';
import { endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { useSalesStore } from '@/store/salesStore';
import { useUserStore } from '@/store/userStore';
import { rangeFromPreset, type RangePreset } from '@/services/reportService';
import { useDebounce } from '@/hooks/useDebounce';
import { formatFriendlyDateTime, formatMoney } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { SALE_STATUS_LABELS } from '@/constants/labels';
import type { Sale, SaleStatus } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SaleStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';

const PRESETS: { id: RangePreset | 'all'; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'all', label: 'Todas' },
];

export function SalesPage() {
  const navigate = useNavigate();
  const sales = useSalesStore((s) => s.sales);
  const users = useUserStore((s) => s.users);

  const [preset, setPreset] = useState<RangePreset | 'all'>('week');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const [methodFilter, setMethodFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const range = preset === 'all' ? null : rangeFromPreset(preset);
    return sales.filter((sale) => {
      if (range && !isWithinInterval(parseISO(sale.date), { start: range.from, end: endOfDay(range.to) })) return false;
      if (methodFilter && !sale.payments.some((p) => p.method === methodFilter)) return false;
      if (sellerFilter && sale.sellerId !== sellerFilter) return false;
      if (statusFilter && sale.status !== statusFilter) return false;
      if (q && !sale.saleNumber.toLowerCase().includes(q) && !(sale.customerName ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sales, preset, debounced, methodFilter, sellerFilter, statusFilter]);

  const totals = useMemo(() => {
    const valid = filtered.filter((s) => s.status !== 'cancelled');
    const total = valid.reduce((acc, s) => acc + s.total, 0);
    return { total, count: valid.length, avg: valid.length ? total / valid.length : 0 };
  }, [filtered]);

  const columns: Column<Sale>[] = [
    { key: 'number', header: 'Venta', render: (s) => <span className="font-semibold">{s.saleNumber}</span> },
    { key: 'date', header: 'Fecha', render: (s) => <span className="text-xs text-slate-500">{formatFriendlyDateTime(s.date)}</span> },
    { key: 'customer', header: 'Cliente', hideOnMobile: true, render: (s) => s.customerName ?? 'Consumidor final' },
    { key: 'seller', header: 'Vendedor', hideOnMobile: true, render: (s) => s.sellerName },
    {
      key: 'method',
      header: 'Pago',
      hideOnMobile: true,
      render: (s) =>
        s.payments.length > 1 ? 'Mixto' : PAYMENT_METHOD_LABELS[s.payments[0]?.method ?? 'cash'],
    },
    { key: 'status', header: 'Estado', render: (s) => <SaleStatusBadge status={s.status} /> },
    { key: 'total', header: 'Total', align: 'right', render: (s) => <span className="font-bold tabular-nums">{formatMoney(s.total)}</span> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Ventas" subtitle={`${filtered.length} ventas en el período`} />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Facturado" value={formatMoney(totals.total)} tone="primary" />
        <StatCard label="Cantidad" value={totals.count} />
        <StatCard label="Ticket promedio" value={formatMoney(totals.avg)} />
      </div>

      <Card className="mb-4 flex flex-col gap-3 p-4">
        <Tabs
          tabs={PRESETS.map((p) => ({ id: p.id, label: p.label }))}
          active={preset}
          onChange={(id) => setPreset(id as RangePreset | 'all')}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Input
            leftIcon={<Search className="size-4" />}
            placeholder="N° de venta o cliente…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            containerClassName="col-span-2 lg:col-span-1"
          />
          <Select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            options={[{ value: '', label: 'Método: todos' }, ...PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))]}
            aria-label="Método de pago"
          />
          <Select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            options={[{ value: '', label: 'Vendedor: todos' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
            aria-label="Vendedor"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'Estado: todos' },
              ...(Object.keys(SALE_STATUS_LABELS) as SaleStatus[]).map((s) => ({ value: s, label: SALE_STATUS_LABELS[s] })),
            ]}
            aria-label="Estado"
          />
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(s) => s.id}
          onRowClick={(s) => navigate(ROUTES.saleDetail(s.id))}
          emptyState={
            <EmptyState
              icon={Receipt}
              title="No hay ventas en este período"
              description="Probá con otro rango de fechas o registrá una venta desde el POS."
            />
          }
        />
      </Card>
    </div>
  );
}
