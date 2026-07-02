import { useEffect, useState } from 'react';
import type { Customer } from '@/types';
import { useCustomerStore } from '@/store/customerStore';
import { generateId } from '@/utils/id';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export function CustomerFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Customer | null;
  onSaved?: (customer: Customer) => void;
}) {
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    document: '',
    cuit: '',
    address: '',
    birthDate: '',
    tags: '',
    notes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name ?? '',
        phone: editing?.phone ?? '',
        email: editing?.email ?? '',
        document: editing?.document ?? '',
        cuit: editing?.cuit ?? '',
        address: editing?.address ?? '',
        birthDate: editing?.birthDate?.slice(0, 10) ?? '',
        tags: editing?.tags.join(', ') ?? '',
        notes: editing?.notes ?? '',
      });
      setError('');
    }
  }, [open, editing]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const birthDate = form.birthDate ? new Date(form.birthDate).toISOString() : null;
    if (editing) {
      updateCustomer(editing.id, { ...form, name: form.name.trim(), tags, birthDate });
      onSaved?.({ ...editing, ...form, name: form.name.trim(), tags, birthDate });
    } else {
      const now = new Date().toISOString();
      const customer: Customer = {
        id: generateId(),
        name: form.name.trim(),
        phone: form.phone,
        email: form.email,
        document: form.document,
        cuit: form.cuit,
        address: form.address,
        birthDate,
        notes: form.notes,
        tags,
        isActive: true,
        debtBalance: 0,
        createdAt: now,
        updatedAt: now,
      };
      addCustomer(customer);
      onSaved?.(customer);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>{editing ? 'Guardar cambios' : 'Crear cliente'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" required value={form.name} onChange={(e) => set({ name: e.target.value })} error={error || undefined} containerClassName="sm:col-span-2" autoFocus />
        <Input label="Teléfono" type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        <Input label="DNI" value={form.document} onChange={(e) => set({ document: e.target.value })} />
        <Input label="CUIT (opcional)" value={form.cuit} onChange={(e) => set({ cuit: e.target.value })} />
        <Input label="Dirección" value={form.address} onChange={(e) => set({ address: e.target.value })} containerClassName="sm:col-span-2" />
        <Input label="Fecha de nacimiento (opcional)" type="date" value={form.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
        <Input label="Etiquetas (separadas por coma)" value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="frecuente, gatos" />
        <Textarea label="Notas" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} containerClassName="sm:col-span-2" />
      </div>
    </Modal>
  );
}
