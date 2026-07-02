import { useMemo, useState } from 'react';
import { Search, UserPlus, UserRound, X } from 'lucide-react';
import type { Customer } from '@/types';
import { useCustomerStore } from '@/store/customerStore';
import { createQuickCustomer } from '@/services/customerService';
import { toast } from '@/store/uiStore';
import { formatMoney } from '@/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export function CustomerPicker({
  customer,
  onChange,
}: {
  customer: Customer | null;
  onChange: (customer: Customer | null) => void;
}) {
  const customers = useCustomerStore((s) => s.customers);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => c.isActive)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.document.includes(q))
      .slice(0, 8);
  }, [customers, query]);

  const createQuick = () => {
    if (!quickName.trim()) {
      toast.error('Ingresá el nombre del cliente.');
      return;
    }
    const created = createQuickCustomer(quickName, quickPhone);
    toast.success('Cliente creado', created.name);
    onChange(created);
    setQuickOpen(false);
    setOpen(false);
    setQuickName('');
    setQuickPhone('');
  };

  return (
    <>
      {customer ? (
        <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2 dark:bg-primary-950">
          <UserRound className="size-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary-900 dark:text-primary-200">{customer.name}</p>
            {customer.debtBalance > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Debe {formatMoney(customer.debtBalance)}</p>
            )}
          </div>
          <button
            onClick={() => onChange(null)}
            aria-label="Quitar cliente"
            className="cursor-pointer rounded p-1 text-primary-400 hover:text-primary-700"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-slate-600"
        >
          <UserRound className="size-4" aria-hidden />
          Cliente: consumidor final (tocá para elegir)
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Seleccionar cliente" size="md">
        <div className="flex flex-col gap-3">
          <Input
            leftIcon={<Search className="size-4" />}
            placeholder="Buscar por nombre, teléfono o DNI…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto">
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No hay clientes que coincidan.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        onChange(c);
                        setOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                        <span className="block text-xs text-slate-400">{c.phone || c.email || c.document || 'Sin datos de contacto'}</span>
                      </span>
                      {c.debtBalance > 0 && <Badge variant="warning">Debe {formatMoney(c.debtBalance)}</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button variant="secondary" onClick={() => setQuickOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            Crear cliente rápido
          </Button>
        </div>
      </Modal>

      <Modal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        title="Cliente rápido"
        description="Solo el nombre es obligatorio. Después podés completar el resto desde Clientes."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setQuickOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createQuick}>Crear y seleccionar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Nombre" required value={quickName} onChange={(e) => setQuickName(e.target.value)} autoFocus />
          <Input label="Teléfono (opcional)" type="tel" value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} />
        </div>
      </Modal>
    </>
  );
}
