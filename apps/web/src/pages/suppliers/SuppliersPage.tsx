import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Truck } from 'lucide-react';
import { useSupplierStore } from '@/store/supplierStore';
import { useProductStore } from '@/store/productStore';
import { isProdMode } from '@/config/appMode';
import { mirrorSupplier } from '@/services/supabase/supabaseSuppliersService';
import { logAudit } from '@/services/auditService';
import { toast } from '@/store/uiStore';
import { useDebounce } from '@/hooks/useDebounce';
import { generateId } from '@/utils/id';
import { formatMoney } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { Supplier } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';

export function SupplierFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Supplier | null;
  onSaved?: (supplier: Supplier) => void;
}) {
  const addSupplier = useSupplierStore((s) => s.addSupplier);
  const updateSupplier = useSupplierStore((s) => s.updateSupplier);
  const [form, setForm] = useState({ name: '', phone: '', email: '', cuit: '', address: '', contactName: '', notes: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name ?? '',
        phone: editing?.phone ?? '',
        email: editing?.email ?? '',
        cuit: editing?.cuit ?? '',
        address: editing?.address ?? '',
        contactName: editing?.contactName ?? '',
        notes: editing?.notes ?? '',
      });
      setError('');
    }
  }, [open, editing]);

  const submit = () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (editing) {
      const updated = { ...editing, ...form, name: form.name.trim() };
      updateSupplier(editing.id, { ...form, name: form.name.trim() });
      if (isProdMode) mirrorSupplier(updated);
      onSaved?.(updated);
    } else {
      const supplier: Supplier = {
        id: generateId(),
        ...form,
        name: form.name.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      addSupplier(supplier);
      if (isProdMode) mirrorSupplier(supplier);
      onSaved?.(supplier);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>{editing ? 'Guardar cambios' : 'Crear proveedor'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={error || undefined} containerClassName="sm:col-span-2" autoFocus />
        <Input label="Teléfono" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <Input label="CUIT" value={form.cuit} onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))} />
        <Input label="Contacto principal" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
        <Input label="Dirección" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} containerClassName="sm:col-span-2" />
        <Textarea label="Notas" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} containerClassName="sm:col-span-2" />
      </div>
    </Modal>
  );
}

export function SuppliersPage() {
  const navigate = useNavigate();
  const suppliers = useSupplierStore((s) => s.suppliers);
  const purchases = useSupplierStore((s) => s.purchases);
  const products = useProductStore((s) => s.products);
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return suppliers.filter((s) => !q || s.name.toLowerCase().includes(q) || s.contactName.toLowerCase().includes(q));
  }, [suppliers, debounced]);

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Proveedor',
      render: (s) => (
        <div>
          <p className="flex items-center gap-2 font-medium">
            {s.name}
            {!s.isActive && <Badge variant="outline">Inactivo</Badge>}
          </p>
          <p className="text-xs text-slate-400">{s.contactName || s.email || s.phone || '—'}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Teléfono', hideOnMobile: true, render: (s) => s.phone || '—' },
    { key: 'cuit', header: 'CUIT', hideOnMobile: true, render: (s) => s.cuit || '—' },
    {
      key: 'products',
      header: 'Productos',
      align: 'center',
      render: (s) => products.filter((p) => p.supplierId === s.id).length,
    },
    {
      key: 'purchases',
      header: 'Total comprado',
      align: 'right',
      render: (s) => (
        <span className="font-semibold tabular-nums">
          {formatMoney(
            purchases
              .filter((p) => p.supplierId === s.id && p.status === 'received')
              .reduce((acc, p) => acc + p.total, 0),
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Proveedores"
        subtitle={`${filtered.length} proveedores`}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Nuevo proveedor
          </Button>
        }
      />
      <Card className="mb-4 p-4">
        <Input
          leftIcon={<Search className="size-4" />}
          placeholder="Buscar proveedor…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(s) => s.id}
          onRowClick={(s) => navigate(ROUTES.supplierDetail(s.id))}
          emptyState={
            <EmptyState
              icon={Truck}
              title="No hay proveedores"
              description="Cargá tus proveedores para asociarlos a productos y órdenes de compra."
              action={<Button onClick={() => setFormOpen(true)}>Crear proveedor</Button>}
            />
          }
        />
      </Card>

      <SupplierFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(supplier) => {
          logAudit({ action: 'supplier_created', module: 'suppliers', description: `Creó el proveedor "${supplier.name}"`, severity: 'success' });
          toast.success('Proveedor creado', supplier.name);
        }}
      />
    </div>
  );
}
