import { useState } from 'react';
import { BadgePercent, Pencil, Plus, Power } from 'lucide-react';
import { isAfter, isBefore, parseISO } from 'date-fns';
import { usePromotionStore } from '@/store/promotionStore';
import { useProductStore } from '@/store/productStore';
import { logAudit } from '@/services/auditService';
import { toast, useUiStore } from '@/store/uiStore';
import { generateId } from '@/utils/id';
import { formatDate } from '@/utils/format';
import { PROMOTION_TYPE_LABELS } from '@/constants/labels';
import type { Promotion, PromotionType } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

function promoStatus(promo: Promotion): { label: string; variant: 'success' | 'warning' | 'default' } {
  const now = new Date();
  if (!promo.isActive) return { label: 'Inactiva', variant: 'default' };
  if (isBefore(now, parseISO(promo.startDate))) return { label: 'Programada', variant: 'warning' };
  if (isAfter(now, parseISO(promo.endDate))) return { label: 'Vencida', variant: 'default' };
  return { label: 'Vigente', variant: 'success' };
}

export function PromotionsPage() {
  const promotions = usePromotionStore((s) => s.promotions);
  const addPromotion = usePromotionStore((s) => s.addPromotion);
  const updatePromotion = usePromotionStore((s) => s.updatePromotion);
  const allCategories = useProductStore((s) => s.categories);
  const allProducts = useProductStore((s) => s.products);
  const categories = allCategories.filter((c) => c.isActive);
  const products = allProducts.filter((p) => p.isActive);
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'percentage' as PromotionType,
    value: '',
    startDate: '',
    endDate: '',
    categoryId: '',
    productId: '',
    conditions: '',
  });
  const [error, setError] = useState('');

  const openModal = (promo?: Promotion) => {
    setEditing(promo ?? null);
    setForm({
      name: promo?.name ?? '',
      type: promo?.type ?? 'percentage',
      value: promo ? String(promo.value) : '',
      startDate: promo?.startDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      endDate: promo?.endDate.slice(0, 10) ?? '',
      categoryId: promo?.categoryIds[0] ?? '',
      productId: promo?.productIds[0] ?? '',
      conditions: promo?.conditions ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return setError('El nombre es obligatorio.');
    if (!form.endDate) return setError('Definí la fecha de fin.');
    const value = Number(form.value) || 0;
    if (form.type !== 'two_for_one' && value <= 0) return setError('El valor debe ser mayor a cero.');

    const data = {
      name: form.name.trim(),
      type: form.type,
      value,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(`${form.endDate}T23:59:59`).toISOString(),
      categoryIds: form.categoryId ? [form.categoryId] : [],
      productIds: form.productId ? [form.productId] : [],
      brandIds: [],
      conditions: form.conditions,
    };
    if (editing) {
      updatePromotion(editing.id, data);
      toast.success('Promoción actualizada');
    } else {
      addPromotion({ ...data, id: generateId(), isActive: true, usedCount: 0, createdAt: new Date().toISOString() });
      logAudit({ action: 'promotion_created', module: 'promotions', description: `Creó la promoción "${data.name}"`, severity: 'success' });
      toast.success('Promoción creada', 'Aparece en el POS mientras esté vigente.');
    }
    setModalOpen(false);
  };

  const toggle = (promo: Promotion) => {
    askConfirm({
      title: promo.isActive ? 'Desactivar promoción' : 'Activar promoción',
      message: promo.isActive ? 'Dejará de mostrarse en el POS.' : 'Volverá a mostrarse en el POS si está dentro de fechas.',
      danger: promo.isActive,
      confirmLabel: promo.isActive ? 'Desactivar' : 'Activar',
      onConfirm: () => {
        updatePromotion(promo.id, { isActive: !promo.isActive });
        toast.success(promo.isActive ? 'Promoción desactivada' : 'Promoción activada');
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Promociones"
        subtitle="Descuentos aplicables desde el POS"
        actions={
          <Button onClick={() => openModal()}>
            <Plus className="size-4" aria-hidden />
            Nueva promoción
          </Button>
        }
      />

      {promotions.length === 0 ? (
        <Card>
          <EmptyState
            icon={BadgePercent}
            title="No hay promociones activas"
            description="Creá descuentos por porcentaje, monto fijo o 2x1 y aplicalos con un toque desde el POS."
            action={<Button onClick={() => openModal()}>Crear la primera</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promo) => {
            const status = promoStatus(promo);
            return (
              <Card key={promo.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-400">
                    <BadgePercent className="size-5" aria-hidden />
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(promo)} aria-label="Editar" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => toggle(promo)} aria-label="Cambiar estado" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800">
                      <Power className="size-4" />
                    </button>
                  </div>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{promo.name}</p>
                <p className="text-xs text-slate-400">
                  {PROMOTION_TYPE_LABELS[promo.type]}
                  {promo.type !== 'two_for_one' && ` · ${promo.type === 'fixed_amount' || promo.type === 'product_discount' ? `$${promo.value.toLocaleString('es-AR')}` : `${promo.value}%`}`}
                </p>
                {promo.conditions && <p className="mt-1 text-xs text-slate-500">{promo.conditions}</p>}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-xs text-slate-400">
                    {formatDate(promo.startDate)} → {formatDate(promo.endDate)}
                    <span className="block">Usada {promo.usedCount} veces</span>
                  </span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar promoción' : 'Nueva promoción'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>{editing ? 'Guardar' : 'Crear promoción'}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} containerClassName="sm:col-span-2" autoFocus />
          <Select
            label="Tipo"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PromotionType }))}
            options={(Object.keys(PROMOTION_TYPE_LABELS) as PromotionType[]).map((t) => ({ value: t, label: PROMOTION_TYPE_LABELS[t] }))}
          />
          {form.type !== 'two_for_one' && (
            <Input
              label={form.type === 'fixed_amount' || form.type === 'product_discount' ? 'Monto ($)' : 'Porcentaje (%)'}
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
          )}
          <Input label="Desde" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          <Input label="Hasta" required type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          {(form.type === 'category_discount') && (
            <Select
              label="Categoría incluida"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              placeholder="Elegir categoría…"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
          {(form.type === 'product_discount' || form.type === 'two_for_one') && (
            <Select
              label="Producto incluido"
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              placeholder="Elegir producto…"
              options={products.map((p) => ({ value: p.id, label: p.name }))}
            />
          )}
          <Textarea label="Condiciones (opcional)" rows={2} value={form.conditions} onChange={(e) => setForm((f) => ({ ...f, conditions: e.target.value }))} containerClassName="sm:col-span-2" />
          {error && <p className="text-sm font-medium text-red-600 sm:col-span-2">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
