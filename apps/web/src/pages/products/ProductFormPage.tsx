import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { useSupplierStore } from '@/store/supplierStore';
import { useBusinessStore } from '@/store/businessStore';
import { createProduct, updateProduct } from '@/services/catalogService';
import { ApiError } from '@/services/api/apiClient';
import { toast } from '@/store/uiStore';
import { calcMarginPercent } from '@/utils/calc';
import { formatPercent } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';

interface FormState {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  brandId: string;
  supplierId: string;
  description: string;
  costPrice: string;
  salePrice: string;
  stock: string;
  minStock: string;
  isActive: boolean;
  isFavorite: boolean;
  notes: string;
}

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const products = useProductStore((s) => s.products);
  const allCategories = useProductStore((s) => s.categories);
  const allBrands = useProductStore((s) => s.brands);
  const allSuppliers = useSupplierStore((s) => s.suppliers);
  const categories = allCategories.filter((c) => c.isActive);
  const brands = allBrands.filter((b) => b.isActive);
  const suppliers = allSuppliers.filter((x) => x.isActive);
  const defaultMinStock = useBusinessStore((s) => s.settings.defaultMinStock);

  const editing = id ? products.find((p) => p.id === id) : undefined;

  const [form, setForm] = useState<FormState>(() => ({
    name: editing?.name ?? '',
    sku: editing?.sku ?? '',
    barcode: editing?.barcode ?? '',
    categoryId: editing?.categoryId ?? '',
    brandId: editing?.brandId ?? '',
    supplierId: editing?.supplierId ?? '',
    description: editing?.description ?? '',
    costPrice: editing ? String(editing.costPrice) : '',
    salePrice: editing ? String(editing.salePrice) : '',
    stock: editing ? String(editing.stock) : '0',
    minStock: editing ? String(editing.minStock) : String(defaultMinStock),
    isActive: editing?.isActive ?? true,
    isFavorite: editing?.isFavorite ?? false,
    notes: editing?.notes ?? '',
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const cost = Number(form.costPrice) || 0;
  const price = Number(form.salePrice) || 0;
  const margin = calcMarginPercent(cost, price);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'El nombre es obligatorio.';
    if (!form.sku.trim()) next.sku = 'El SKU es obligatorio.';
    else if (products.some((p) => p.sku.toLowerCase() === form.sku.trim().toLowerCase() && p.id !== editing?.id)) {
      next.sku = 'El SKU ya existe.';
    }
    if (!form.categoryId) next.categoryId = 'Elegí una categoría.';
    if (price <= 0) next.salePrice = 'El precio debe ser mayor a cero.';
    if (cost < 0) next.costPrice = 'El costo no puede ser negativo.';
    if (Number(form.stock) < 0) next.stock = 'El stock no puede ser negativo.';
    if (Number(form.minStock) < 0) next.minStock = 'No puede ser negativo.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.error('Revisá los campos marcados en rojo.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateProduct(editing.id, {
          name: form.name.trim(),
          sku: form.sku.trim(),
          barcode: form.barcode.trim(),
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          supplierId: form.supplierId || null,
          description: form.description,
          costPrice: cost,
          salePrice: price,
          minStock: Number(form.minStock),
          isActive: form.isActive,
          isFavorite: form.isFavorite,
          notes: form.notes,
        });
        toast.success('Producto actualizado');
        navigate(ROUTES.productDetail(editing.id));
      } else {
        const product = await createProduct({
          name: form.name.trim(),
          sku: form.sku.trim(),
          barcode: form.barcode.trim(),
          description: form.description,
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          supplierId: form.supplierId || null,
          costPrice: cost,
          salePrice: price,
          stock: Number(form.stock),
          minStock: Number(form.minStock),
          isFavorite: form.isFavorite,
          notes: form.notes,
        });
        toast.success('Producto creado', product.name);
        navigate(ROUTES.productDetail(product.id));
      }
    } catch (err) {
      toast.error('No se pudo guardar el producto', err instanceof ApiError ? err.message : undefined);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader
        title={editing ? `Editar: ${editing.name}` : 'Nuevo producto'}
        backTo={editing ? ROUTES.productDetail(editing.id) : ROUTES.products}
        actions={
          <Button onClick={submit} loading={saving}>
            <Save className="size-4" aria-hidden />
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Datos generales" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" required value={form.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} containerClassName="sm:col-span-2" />
            <Input label="SKU" required value={form.sku} onChange={(e) => set({ sku: e.target.value })} error={errors.sku} hint="Código interno único" />
            <Input label="Código de barras (opcional)" value={form.barcode} onChange={(e) => set({ barcode: e.target.value })} inputMode="numeric" />
            <Select label="Categoría" required value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })} placeholder="Elegir categoría…" options={categories.map((c) => ({ value: c.id, label: c.name }))} error={errors.categoryId} />
            <Select label="Marca (opcional)" value={form.brandId} onChange={(e) => set({ brandId: e.target.value })} placeholder="Sin marca" options={brands.map((b) => ({ value: b.id, label: b.name }))} />
            <Select label="Proveedor (opcional)" value={form.supplierId} onChange={(e) => set({ supplierId: e.target.value })} placeholder="Sin proveedor" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} containerClassName="sm:col-span-2" />
            <Textarea label="Descripción (opcional)" value={form.description} onChange={(e) => set({ description: e.target.value })} containerClassName="sm:col-span-2" rows={2} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Precios" subtitle="El margen se calcula automáticamente" />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Input label="Precio de costo" type="number" min={0} inputMode="decimal" value={form.costPrice} onChange={(e) => set({ costPrice: e.target.value })} error={errors.costPrice} leftIcon={<span className="text-sm font-semibold">$</span>} />
            <Input label="Precio de venta" required type="number" min={0} inputMode="decimal" value={form.salePrice} onChange={(e) => set({ salePrice: e.target.value })} error={errors.salePrice} leftIcon={<span className="text-sm font-semibold">$</span>} />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Margen estimado</span>
              <div className={`flex h-10 items-center rounded-lg px-3 text-sm font-bold ${margin < 0 ? 'bg-red-50 text-red-600 dark:bg-red-950' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                {formatPercent(margin)}
              </div>
            </div>
            {price > 0 && cost > price && (
              <p className="text-xs font-medium text-amber-600 sm:col-span-3">
                ⚠ El precio de venta es menor que el costo: estarías vendiendo a pérdida.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Stock" subtitle={editing ? 'El stock se modifica desde “Ajustar stock” para dejar trazabilidad' : undefined} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Input label="Stock inicial" type="number" min={0} inputMode="numeric" value={form.stock} onChange={(e) => set({ stock: e.target.value })} error={errors.stock} disabled={Boolean(editing)} />
            <Input label="Stock mínimo (alerta)" type="number" min={0} inputMode="numeric" value={form.minStock} onChange={(e) => set({ minStock: e.target.value })} error={errors.minStock} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4 pt-5">
            <Switch checked={form.isActive} onChange={(v) => set({ isActive: v })} label="Producto activo" description="Los inactivos no aparecen en el POS" />
            <Switch checked={form.isFavorite} onChange={(v) => set({ isFavorite: v })} label="Favorito en el POS" description="Aparece primero en la pestaña Favoritos" />
            <Textarea label="Notas internas (opcional)" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </CardBody>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={submit} loading={saving}>
            <Save className="size-4" aria-hidden />
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </div>
    </div>
  );
}
