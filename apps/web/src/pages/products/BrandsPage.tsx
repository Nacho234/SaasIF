import { useState } from 'react';
import { Bookmark, Pencil, Plus, Power } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { createBrand, updateBrand } from '@/services/catalogService';
import { ApiError } from '@/services/api/apiClient';
import { toast, useUiStore } from '@/store/uiStore';
import type { Brand } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';

export function BrandsPage() {
  const brands = useProductStore((s) => s.brands);
  const products = useProductStore((s) => s.products);
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const openModal = (brand?: Brand) => {
    setEditing(brand ?? null);
    setName(brand?.name ?? '');
    setDescription(brand?.description ?? '');
    setError('');
    setModalOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    try {
      if (editing) {
        await updateBrand(editing.id, { name: name.trim(), description });
        toast.success('Marca actualizada');
      } else {
        await createBrand({ name: name.trim(), description });
        toast.success('Marca creada');
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la marca.');
    }
  };

  const toggle = (brand: Brand) => {
    askConfirm({
      title: brand.isActive ? 'Desactivar marca' : 'Reactivar marca',
      message: brand.isActive ? 'La marca dejará de ofrecerse al crear productos.' : 'La marca volverá a estar disponible.',
      danger: brand.isActive,
      confirmLabel: brand.isActive ? 'Desactivar' : 'Reactivar',
      onConfirm: () => {
        void updateBrand(brand.id, { isActive: !brand.isActive })
          .then(() => toast.success(brand.isActive ? 'Marca desactivada' : 'Marca reactivada'))
          .catch(() => toast.error('No se pudo actualizar la marca.'));
      },
    });
  };

  const columns: Column<Brand>[] = [
    {
      key: 'name',
      header: 'Marca',
      render: (b) => (
        <span className="flex items-center gap-2 font-medium">
          {b.name}
          {!b.isActive && <Badge variant="outline">Inactiva</Badge>}
        </span>
      ),
    },
    { key: 'description', header: 'Descripción', hideOnMobile: true, render: (b) => b.description || '—' },
    {
      key: 'count',
      header: 'Productos',
      align: 'center',
      render: (b) => products.filter((p) => p.brandId === b.id).length,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openModal(b)} aria-label="Editar" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <Pencil className="size-4" />
          </button>
          <button onClick={() => toggle(b)} aria-label="Cambiar estado" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800">
            <Power className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Marcas"
        subtitle={`${brands.length} marcas`}
        actions={
          <Button onClick={() => openModal()}>
            <Plus className="size-4" aria-hidden />
            Nueva marca
          </Button>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          rows={brands}
          rowKey={(b) => b.id}
          emptyState={
            <EmptyState
              icon={Bookmark}
              title="No hay marcas"
              description="Las marcas ayudan a filtrar el catálogo."
              action={<Button onClick={() => openModal()}>Crear la primera</Button>}
            />
          }
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar marca' : 'Nueva marca'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>{editing ? 'Guardar' : 'Crear'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} error={error || undefined} autoFocus />
          <Input label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
