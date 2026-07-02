import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Power, Tags } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { logAudit } from '@/services/auditService';
import { toast, useUiStore } from '@/store/uiStore';
import { generateId } from '@/utils/id';
import { ROUTES } from '@/constants/routes';
import type { Category } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

const COLOR_CHOICES = ['#f59e0b', '#8b5cf6', '#ec4899', '#22c55e', '#06b6d4', '#64748b', '#a855f7', '#ef4444', '#0ea5e9', '#78716c'];

export function CategoriesPage() {
  const categories = useProductStore((s) => s.categories);
  const products = useProductStore((s) => s.products);
  const addCategory = useProductStore((s) => s.addCategory);
  const updateCategory = useProductStore((s) => s.updateCategory);
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_CHOICES[0]!);
  const [error, setError] = useState('');

  const openModal = (category?: Category) => {
    setEditing(category ?? null);
    setName(category?.name ?? '');
    setDescription(category?.description ?? '');
    setColor(category?.color ?? COLOR_CHOICES[categories.length % COLOR_CHOICES.length]!);
    setError('');
    setModalOpen(true);
  };

  const submit = () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (editing) {
      updateCategory(editing.id, { name: name.trim(), description, color });
      toast.success('Categoría actualizada');
    } else {
      addCategory({ id: generateId(), name: name.trim(), description, color, isActive: true });
      logAudit({ action: 'category_created', module: 'products', description: `Creó la categoría "${name.trim()}"` });
      toast.success('Categoría creada');
    }
    setModalOpen(false);
  };

  const toggle = (category: Category) => {
    askConfirm({
      title: category.isActive ? 'Desactivar categoría' : 'Reactivar categoría',
      message: category.isActive
        ? 'La categoría dejará de aparecer como filtro en el POS. Los productos no se modifican.'
        : 'La categoría volverá a estar disponible.',
      danger: category.isActive,
      confirmLabel: category.isActive ? 'Desactivar' : 'Reactivar',
      onConfirm: () => {
        updateCategory(category.id, { isActive: !category.isActive });
        toast.success(category.isActive ? 'Categoría desactivada' : 'Categoría reactivada');
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Categorías"
        subtitle={`${categories.length} categorías`}
        actions={
          <Button onClick={() => openModal()}>
            <Plus className="size-4" aria-hidden />
            Nueva categoría
          </Button>
        }
      />

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tags}
            title="No hay categorías"
            description="Las categorías organizan el catálogo y los accesos rápidos del POS."
            action={<Button onClick={() => openModal()}>Crear la primera</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const count = products.filter((p) => p.categoryId === category.id).length;
            return (
              <Card key={category.id} className="flex items-center gap-3 p-4">
                <span className="size-10 shrink-0 rounded-xl" style={{ backgroundColor: `${category.color}33`, border: `2px solid ${category.color}` }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                    <span className="truncate">{category.name}</span>
                    {!category.isActive && <Badge variant="outline">Inactiva</Badge>}
                  </p>
                  <p className="truncate text-xs text-slate-400">{category.description || 'Sin descripción'}</p>
                  <Link to={`${ROUTES.products}`} className="text-xs font-semibold text-primary-600 hover:underline">
                    {count} producto{count === 1 ? '' : 's'}
                  </Link>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openModal(category)} aria-label="Editar" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => toggle(category)} aria-label={category.isActive ? 'Desactivar' : 'Reactivar'} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800">
                    <Power className="size-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
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
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={`size-8 cursor-pointer rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
