import { useMemo, useState } from 'react';
import { Ban, Banknote, Plus } from 'lucide-react';
import { useExpenseStore } from '@/store/expenseStore';
import { registerExpense, voidExpense } from '@/services/expenseService';
import { getOpenRegister } from '@/services/cashRegisterService';
import { toast, useUiStore } from '@/store/uiStore';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatFriendlyDateTime, formatMoney } from '@/utils/format';
import { round2 } from '@/utils/calc';
import { EXPENSE_CATEGORY_LABELS } from '@/constants/labels';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import type { Expense, ExpenseCategory, PaymentMethodId } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';

export function ExpensesPage() {
  const expenses = useExpenseStore((s) => s.expenses);
  const askConfirm = useUiStore((s) => s.askConfirm);
  const { can } = usePermissions();

  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'other' as ExpenseCategory,
    description: '',
    amount: '',
    paymentMethod: 'cash' as PaymentMethodId,
    attachToCash: true,
    notes: '',
  });
  const [error, setError] = useState('');

  const filtered = useMemo(
    () => expenses.filter((e) => !categoryFilter || e.category === categoryFilter),
    [expenses, categoryFilter],
  );
  const monthTotal = useMemo(() => {
    const now = new Date();
    return round2(
      expenses
        .filter((e) => e.status === 'active' && new Date(e.date).getMonth() === now.getMonth() && new Date(e.date).getFullYear() === now.getFullYear())
        .reduce((acc, e) => acc + e.amount, 0),
    );
  }, [expenses]);

  const submit = () => {
    const result = registerExpense({
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      attachToCash: form.attachToCash,
      notes: form.notes,
    });
    if (result.ok) {
      toast.success('Gasto registrado', form.attachToCash && getOpenRegister() ? 'Se descontó de la caja abierta.' : undefined);
      setModalOpen(false);
      setForm({ category: 'other', description: '', amount: '', paymentMethod: 'cash', attachToCash: true, notes: '' });
      setError('');
    } else {
      setError(result.error ?? 'No se pudo registrar el gasto.');
    }
  };

  const onVoid = (expense: Expense) => {
    askConfirm({
      title: 'Anular gasto',
      message: `Se anula "${expense.description}" por ${formatCurrency(expense.amount)}. Si estaba asociado a la caja abierta, se corrige el saldo.`,
      confirmLabel: 'Anular gasto',
      danger: true,
      onConfirm: () => {
        const result = voidExpense(expense.id);
        if (result.ok) toast.success('Gasto anulado');
        else toast.error('No se pudo anular', result.error);
      },
    });
  };

  const columns: Column<Expense>[] = [
    { key: 'date', header: 'Fecha', render: (e) => <span className="text-xs text-slate-500">{formatFriendlyDateTime(e.date)}</span> },
    {
      key: 'description',
      header: 'Descripción',
      render: (e) => (
        <div>
          <p className={`font-medium ${e.status === 'void' ? 'text-slate-400 line-through' : ''}`}>{e.description}</p>
          <p className="text-xs text-slate-400">{e.userName}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Categoría', render: (e) => <Badge>{EXPENSE_CATEGORY_LABELS[e.category]}</Badge> },
    { key: 'method', header: 'Método', hideOnMobile: true, render: (e) => PAYMENT_METHOD_LABELS[e.paymentMethod] },
    {
      key: 'cash',
      header: 'Caja',
      hideOnMobile: true,
      render: (e) => (e.cashRegisterId ? <Badge variant="info">En caja</Badge> : <span className="text-slate-300">—</span>),
    },
    {
      key: 'amount',
      header: 'Monto',
      align: 'right',
      render: (e) => (
        <span className={`font-bold tabular-nums ${e.status === 'void' ? 'text-slate-300 line-through' : 'text-red-500'}`}>
          −{formatCurrency(e.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) =>
        e.status === 'active' && can('register_expenses') ? (
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              onVoid(e);
            }}
            aria-label="Anular gasto"
            className="cursor-pointer rounded-lg p-1.5 text-slate-300 hover:text-red-500"
          >
            <Ban className="size-4" />
          </button>
        ) : e.status === 'void' ? (
          <Badge variant="outline">Anulado</Badge>
        ) : null,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Gastos"
        subtitle="Egresos del local (alquiler, servicios, insumos…)"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Registrar gasto
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Gastos del mes" value={formatMoney(monthTotal)} icon={Banknote} tone="danger" />
        <StatCard label="Registros" value={filtered.length} icon={Banknote} />
      </div>

      <Card className="mb-4 p-4">
        <Select
          label="Filtrar por categoría"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          placeholder="Todas las categorías"
          options={(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => ({
            value: c,
            label: EXPENSE_CATEGORY_LABELS[c],
          }))}
          containerClassName="max-w-xs"
        />
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(e) => e.id}
          emptyState={
            <EmptyState
              icon={Banknote}
              title="No hay gastos registrados"
              description="Registrá los gastos del local para tener el resultado real del negocio."
              action={<Button onClick={() => setModalOpen(true)}>Registrar gasto</Button>}
            />
          }
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar gasto"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>Registrar gasto</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoría"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
              options={(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => ({
                value: c,
                label: EXPENSE_CATEGORY_LABELS[c],
              }))}
            />
            <Input
              label="Monto"
              required
              type="number"
              min={0}
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              leftIcon={<span className="text-sm font-semibold">$</span>}
            />
          </div>
          <Input
            label="Descripción"
            required
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Ej: pago de luz, insumos de limpieza…"
          />
          <Select
            label="Método de pago"
            value={form.paymentMethod}
            onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethodId }))}
            options={PAYMENT_METHODS.filter((m) => m.id !== 'customer_credit').map((m) => ({ value: m.id, label: m.label }))}
          />
          <Switch
            checked={form.attachToCash}
            onChange={(v) => setForm((f) => ({ ...f, attachToCash: v }))}
            label="Descontar de la caja abierta"
            description={getOpenRegister() ? 'Se registrará como egreso del turno actual' : 'No hay caja abierta: se guarda sin afectar caja'}
          />
          <Input label="Observación (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
