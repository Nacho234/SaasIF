import { useMemo, useState } from 'react';
import { Gift, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { comboAvailableStock } from '@/services/salesService';
import { logAudit } from '@/services/auditService';
import { toast, useUiStore } from '@/store/uiStore';
import { generateId } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { formatCurrency, formatMoney } from '@/utils/format';
import type { Combo } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

interface ComboItemDraft {
  productId: string;
  quantity: number;
}

export function CombosPage() {
  const combos = useProductStore((s) => s.combos);
  const allProducts = useProductStore((s) => s.products);
  const products = useMemo(() => allProducts.filter((p) => p.isActive), [allProducts]);
  const addCombo = useProductStore((s) => s.addCombo);
  const updateCombo = useProductStore((s) => s.updateCombo);
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Combo | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ComboItemDraft[]>([]);
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const normalPrice = useMemo(
    () =>
      round2(
        items.reduce((acc, it) => {
          const product = products.find((p) => p.id === it.productId);
          return acc + (product?.salePrice ?? 0) * it.quantity;
        }, 0),
      ),
    [items, products],
  );
  const saving = round2(normalPrice - (Number(price) || 0));

  const openModal = (combo?: Combo) => {
    setEditing(combo ?? null);
    setName(combo?.name ?? '');
    setDescription(combo?.description ?? '');
    setItems(combo?.items.map((i) => ({ ...i })) ?? []);
    setPrice(combo ? String(combo.comboPrice) : '');
    setError('');
    setModalOpen(true);
  };

  const submit = () => {
    if (!name.trim()) return setError('El nombre es obligatorio.');
    const valid = items.filter((i) => i.productId && i.quantity > 0);
    if (valid.length < 2) return setError('Un combo necesita al menos 2 productos.');
    const p = Number(price);
    if (!p || p <= 0) return setError('El precio del combo debe ser mayor a cero.');

    if (editing) {
      updateCombo(editing.id, { name: name.trim(), description, items: valid, comboPrice: p });
      toast.success('Combo actualizado');
    } else {
      addCombo({
        id: generateId(),
        name: name.trim(),
        description,
        items: valid,
        comboPrice: p,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      logAudit({ action: 'combo_created', module: 'products', description: `Creó el combo "${name.trim()}"` });
      toast.success('Combo creado', 'Ya está disponible en el POS.');
    }
    setModalOpen(false);
  };

  const toggle = (combo: Combo) => {
    askConfirm({
      title: combo.isActive ? 'Desactivar combo' : 'Reactivar combo',
      message: combo.isActive ? 'El combo dejará de aparecer en el POS.' : 'El combo volverá a estar disponible.',
      danger: combo.isActive,
      confirmLabel: combo.isActive ? 'Desactivar' : 'Reactivar',
      onConfirm: () => {
        updateCombo(combo.id, { isActive: !combo.isActive });
        toast.success(combo.isActive ? 'Combo desactivado' : 'Combo reactivado');
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Combos"
        subtitle="Paquetes de productos con precio especial. Al venderlos se descuenta el stock de cada componente."
        actions={
          <Button onClick={() => openModal()}>
            <Plus className="size-4" aria-hidden />
            Nuevo combo
          </Button>
        }
      />

      {combos.length === 0 ? (
        <Card>
          <EmptyState
            icon={Gift}
            title="No hay combos"
            description="Armá paquetes con precio especial para vender más unidades por ticket."
            action={<Button onClick={() => openModal()}>Crear el primero</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => {
            const available = comboAvailableStock(combo, products);
            const normal = round2(
              combo.items.reduce((acc, it) => acc + (products.find((p) => p.id === it.productId)?.salePrice ?? 0) * it.quantity, 0),
            );
            return (
              <Card key={combo.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                    <Gift className="size-5" aria-hidden />
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(combo)} aria-label="Editar" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => toggle(combo)} aria-label="Cambiar estado" className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800">
                      <Power className="size-4" />
                    </button>
                  </div>
                </div>
                <p className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  {combo.name}
                  {!combo.isActive && <Badge variant="outline">Inactivo</Badge>}
                </p>
                <p className="text-xs text-slate-400">{combo.description}</p>
                <ul className="mt-2 flex flex-col gap-0.5 text-xs text-slate-500">
                  {combo.items.map((it) => {
                    const product = products.find((p) => p.id === it.productId);
                    return (
                      <li key={it.productId}>
                        {it.quantity}× {product?.name ?? 'Producto eliminado'}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <div>
                    <p className="text-xs text-slate-400 line-through tabular-nums">{formatMoney(normal)}</p>
                    <p className="font-display text-lg font-bold text-slate-900 tabular-nums dark:text-slate-50">
                      {formatMoney(combo.comboPrice)}
                    </p>
                    <Badge variant="success">Ahorro {formatMoney(round2(normal - combo.comboPrice))}</Badge>
                  </div>
                  <Badge variant={available > 0 ? 'default' : 'danger'}>
                    {available > 0 ? `${available} disponibles` : 'Sin stock'}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar combo' : 'Nuevo combo'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>{editing ? 'Guardar' : 'Crear combo'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Productos incluidos</p>
            <div className="flex flex-col gap-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={item.productId}
                    onChange={(e) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, productId: e.target.value } : it)))}
                    placeholder="Elegir producto…"
                    options={products.map((p) => ({ value: p.id, label: `${p.name} (${formatMoney(p.salePrice)})` }))}
                    containerClassName="flex-1"
                    aria-label="Producto"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, Number(e.target.value)) } : it)))}
                    containerClassName="w-20"
                    aria-label="Cantidad"
                  />
                  <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} aria-label="Quitar" className="cursor-pointer rounded p-1.5 text-slate-300 hover:text-red-500">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setItems((prev) => [...prev, { productId: '', quantity: 1 }])}>
                <Plus className="size-4" aria-hidden /> Agregar producto
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio del combo"
              required
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              leftIcon={<span className="text-sm font-semibold">$</span>}
              hint={normalPrice > 0 ? `Precio normal: ${formatCurrency(normalPrice)}` : undefined}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ahorro para el cliente</span>
              <div className={`flex h-10 items-center rounded-lg px-3 text-sm font-bold ${saving > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                {saving > 0 ? formatCurrency(saving) : '—'}
              </div>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
