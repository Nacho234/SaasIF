import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Banknote, BookUser, Pencil, Power, Receipt, Users } from 'lucide-react';
import { useCustomerStore } from '@/store/customerStore';
import { useSalesStore } from '@/store/salesStore';
import { useBusinessStore } from '@/store/businessStore';
import { registerDebtPayment } from '@/services/customerService';
import { logAudit } from '@/services/auditService';
import { toast, useUiStore } from '@/store/uiStore';
import { formatCurrency, formatFriendlyDateTime, formatMoney } from '@/utils/format';
import { round2 } from '@/utils/calc';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import type { PaymentMethodId } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SaleStatusBadge } from '@/components/ui/StatusBadge';
import { CustomerFormModal } from './CustomerFormModal';

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = useCustomerStore((s) => s.customers.find((c) => c.id === id));
  const allPayments = useCustomerStore((s) => s.payments);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const allSales = useSalesStore((s) => s.sales);
  const payments = useMemo(() => allPayments.filter((p) => p.customerId === id), [allPayments, id]);
  const sales = useMemo(() => allSales.filter((x) => x.customerId === id), [allSales, id]);
  const allowCredit = useBusinessStore((s) => s.settings.allowCustomerCredit);
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethodId>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');

  const stats = useMemo(() => {
    const valid = sales.filter((s) => s.status !== 'cancelled');
    const total = round2(valid.reduce((acc, s) => acc + s.total, 0));
    return {
      total,
      count: valid.length,
      avg: valid.length ? round2(total / valid.length) : 0,
      last: valid[0]?.date ?? null,
    };
  }, [sales]);

  if (!customer) {
    return (
      <EmptyState
        icon={Users}
        title="Cliente no encontrado"
        action={<Button onClick={() => navigate(ROUTES.customers)}>Volver a clientes</Button>}
      />
    );
  }

  const submitPayment = () => {
    const result = registerDebtPayment({
      customerId: customer.id,
      amount: Number(payAmount),
      method: payMethod,
      notes: payNotes,
    });
    if (result.ok) {
      toast.success('Pago registrado', 'La deuda del cliente se actualizó.');
      setPayOpen(false);
      setPayAmount('');
      setPayNotes('');
      setPayError('');
    } else {
      setPayError(result.error ?? 'No se pudo registrar el pago.');
    }
  };

  const toggleActive = () => {
    askConfirm({
      title: customer.isActive ? 'Desactivar cliente' : 'Reactivar cliente',
      message: customer.isActive
        ? 'El cliente no aparecerá en el selector del POS. Su historial se conserva.'
        : 'El cliente vuelve a estar disponible.',
      danger: customer.isActive,
      confirmLabel: customer.isActive ? 'Desactivar' : 'Reactivar',
      onConfirm: () => {
        updateCustomer(customer.id, { isActive: !customer.isActive });
        toast.success(customer.isActive ? 'Cliente desactivado' : 'Cliente reactivado');
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {customer.name}
            {!customer.isActive && <Badge variant="outline">Inactivo</Badge>}
          </span>
        }
        subtitle={[customer.phone, customer.email, customer.document && `DNI ${customer.document}`].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
        backTo={ROUTES.customers}
        actions={
          <>
            <Button variant="secondary" onClick={toggleActive}>
              <Power className="size-4" aria-hidden />
              {customer.isActive ? 'Desactivar' : 'Reactivar'}
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden />
              Editar
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total comprado" value={formatMoney(stats.total)} icon={Receipt} tone="primary" hint={`${stats.count} compras`} />
        <StatCard label="Ticket promedio" value={formatMoney(stats.avg)} icon={Receipt} />
        <StatCard label="Última compra" value={stats.last ? formatFriendlyDateTime(stats.last) : '—'} icon={Receipt} />
        <StatCard
          label="Cuenta corriente"
          value={customer.debtBalance > 0 ? formatMoney(customer.debtBalance) : customer.debtBalance < 0 ? `A favor ${formatMoney(-customer.debtBalance)}` : 'Sin deuda'}
          icon={BookUser}
          tone={customer.debtBalance > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cuenta corriente */}
        <Card>
          <CardHeader
            title="Cuenta corriente"
            action={
              allowCredit && customer.debtBalance > 0 ? (
                <Button size="sm" onClick={() => setPayOpen(true)}>
                  <Banknote className="size-4" aria-hidden />
                  Registrar pago
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            <div className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-center dark:bg-slate-800/60">
              <p className="text-xs text-slate-500">Saldo actual</p>
              <p className={`font-display text-2xl font-bold tabular-nums ${customer.debtBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrency(Math.abs(customer.debtBalance))}
              </p>
              <Badge variant={customer.debtBalance > 0 ? 'warning' : 'success'}>
                {customer.debtBalance > 0 ? 'Deuda pendiente' : customer.debtBalance < 0 ? 'Crédito a favor' : 'Sin deuda'}
              </Badge>
            </div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Pagos registrados</p>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400">Todavía no hay pagos.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      {formatFriendlyDateTime(p.date)}
                      <span className="block text-xs text-slate-400">{PAYMENT_METHOD_LABELS[p.method]} · {p.userName}</span>
                    </span>
                    <span className="font-bold text-emerald-600 tabular-nums">+{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Historial de compras */}
        <Card className="lg:col-span-2">
          <CardHeader title="Historial de compras" subtitle={`${sales.length} ventas`} />
          <CardBody className="px-2">
            {sales.length === 0 ? (
              <EmptyState icon={Receipt} title="Sin compras registradas" className="py-6" />
            ) : (
              <ul className="flex flex-col">
                {sales.slice(0, 12).map((sale) => (
                  <li key={sale.id}>
                    <Link
                      to={ROUTES.saleDetail(sale.id)}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span>
                        <span className="block text-sm font-semibold">{sale.saleNumber}</span>
                        <span className="block text-xs text-slate-400">
                          {formatFriendlyDateTime(sale.date)} · {sale.items.length} ítem{sale.items.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <SaleStatusBadge status={sale.status} />
                        <span className="font-bold tabular-nums">{formatMoney(sale.total)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Datos y notas */}
      <Card className="mt-4">
        <CardHeader title="Datos del cliente" />
        <CardBody className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-slate-400">Dirección</p><p className="font-medium">{customer.address || '—'}</p></div>
          <div><p className="text-xs text-slate-400">CUIT</p><p className="font-medium">{customer.cuit || '—'}</p></div>
          <div><p className="text-xs text-slate-400">Cliente desde</p><p className="font-medium">{formatFriendlyDateTime(customer.createdAt)}</p></div>
          <div>
            <p className="text-xs text-slate-400">Etiquetas</p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {customer.tags.length ? customer.tags.map((t) => <Badge key={t}>{t}</Badge>) : '—'}
            </div>
          </div>
          {customer.notes && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:col-span-2 lg:col-span-4 dark:bg-amber-950 dark:text-amber-300">
              {customer.notes}
            </p>
          )}
        </CardBody>
      </Card>

      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} editing={customer} onSaved={() => {
        logAudit({ action: 'customer_updated', module: 'customers', description: `Editó el cliente "${customer.name}"` });
        toast.success('Cliente actualizado');
      }} />

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Registrar pago de deuda"
        description={`Deuda actual: ${formatCurrency(customer.debtBalance)}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancelar</Button>
            <Button onClick={submitPayment}>Registrar pago</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Monto"
            required
            type="number"
            min={0}
            inputMode="decimal"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            leftIcon={<span className="text-sm font-semibold">$</span>}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPayAmount(String(customer.debtBalance))}>
              Pagar todo ({formatCurrency(customer.debtBalance)})
            </Button>
          </div>
          <Select
            label="Método"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value as PaymentMethodId)}
            options={PAYMENT_METHODS.filter((m) => m.id !== 'customer_credit').map((m) => ({ value: m.id, label: m.label }))}
          />
          <Input label="Observación (opcional)" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          {payError && <p className="text-sm font-medium text-red-600">{payError}</p>}
        </div>
      </Modal>
    </div>
  );
}
