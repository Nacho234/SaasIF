import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { useCustomerStore } from '@/store/customerStore';
import { useSalesStore } from '@/store/salesStore';
import { logAudit } from '@/services/auditService';
import { toast } from '@/store/uiStore';
import { useDebounce } from '@/hooks/useDebounce';
import { generateId } from '@/utils/id';
import { formatMoney, formatFriendlyDateTime } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { Customer } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { CustomerFormModal } from './CustomerFormModal';

export function CustomersPage() {
  const navigate = useNavigate();
  const customers = useCustomerStore((s) => s.customers);
  const sales = useSalesStore((s) => s.sales);

  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const [debtFilter, setDebtFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [formOpen, setFormOpen] = useState(false);

  const lastPurchase = useMemo(() => {
    const map = new Map<string, string>();
    for (const sale of sales) {
      if (sale.customerId && !map.has(sale.customerId)) map.set(sale.customerId, sale.date);
    }
    return map;
  }, [sales]);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const sale of sales) {
      if (sale.customerId && sale.status !== 'cancelled') {
        map.set(sale.customerId, (map.get(sale.customerId) ?? 0) + sale.total);
      }
    }
    return map;
  }, [sales]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return customers
      .filter((c) => {
        if (statusFilter === 'active' && !c.isActive) return false;
        if (statusFilter === 'inactive' && c.isActive) return false;
        if (debtFilter === 'debt' && c.debtBalance <= 0) return false;
        if (debtFilter === 'nodebt' && c.debtBalance > 0) return false;
        if (
          q &&
          !c.name.toLowerCase().includes(q) &&
          !c.phone.includes(q) &&
          !c.email.toLowerCase().includes(q) &&
          !c.document.includes(q) &&
          !c.cuit.includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0));
  }, [customers, debounced, debtFilter, statusFilter, totals]);

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Cliente',
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} color="#0891b2" size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
              <span className="truncate">{c.name}</span>
              {!c.isActive && <Badge variant="outline">Inactivo</Badge>}
            </p>
            <p className="text-xs text-slate-400">{c.phone || c.email || c.document || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'tags',
      header: 'Etiquetas',
      hideOnMobile: true,
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.tags.length === 0 ? <span className="text-slate-300">—</span> : c.tags.map((t) => <Badge key={t}>{t}</Badge>)}
        </div>
      ),
    },
    {
      key: 'last',
      header: 'Última compra',
      hideOnMobile: true,
      render: (c) => {
        const date = lastPurchase.get(c.id);
        return date ? <span className="text-xs text-slate-500">{formatFriendlyDateTime(date)}</span> : <span className="text-slate-300">—</span>;
      },
    },
    {
      key: 'total',
      header: 'Total comprado',
      align: 'right',
      render: (c) => <span className="font-semibold tabular-nums">{formatMoney(totals.get(c.id) ?? 0)}</span>,
    },
    {
      key: 'debt',
      header: 'Deuda',
      align: 'right',
      render: (c) =>
        c.debtBalance > 0 ? (
          <Badge variant="warning">Debe {formatMoney(c.debtBalance)}</Badge>
        ) : c.debtBalance < 0 ? (
          <Badge variant="success">A favor {formatMoney(-c.debtBalance)}</Badge>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clientes"
        subtitle={`${filtered.length} de ${customers.length} clientes`}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Nuevo cliente
          </Button>
        }
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row">
        <Input
          leftIcon={<Search className="size-4" />}
          placeholder="Buscar por nombre, teléfono, email o DNI…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          containerClassName="flex-1"
        />
        <Select
          value={debtFilter}
          onChange={(e) => setDebtFilter(e.target.value)}
          options={[
            { value: '', label: 'Deuda: todos' },
            { value: 'debt', label: 'Con deuda' },
            { value: 'nodebt', label: 'Sin deuda' },
          ]}
          aria-label="Filtro de deuda"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'active', label: 'Activos' },
            { value: 'inactive', label: 'Inactivos' },
            { value: 'all', label: 'Todos' },
          ]}
          aria-label="Filtro de estado"
        />
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(ROUTES.customerDetail(c.id))}
          emptyState={
            <EmptyState
              icon={Users}
              title="No hay clientes"
              description="Cargá tu primer cliente o creálo rápido desde el POS al vender."
              action={<Button onClick={() => setFormOpen(true)}>Crear cliente</Button>}
            />
          }
        />
      </Card>

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(customer) => {
          logAudit({ action: 'customer_created', module: 'customers', description: `Creó el cliente "${customer.name}"`, severity: 'success' });
          toast.success('Cliente creado', customer.name);
          navigate(ROUTES.customerDetail(customer.id));
        }}
      />
    </div>
  );
}

export function createEmptyCustomer(): Customer {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '',
    phone: '',
    email: '',
    document: '',
    cuit: '',
    address: '',
    birthDate: null,
    notes: '',
    tags: [],
    isActive: true,
    debtBalance: 0,
    createdAt: now,
    updatedAt: now,
  };
}
