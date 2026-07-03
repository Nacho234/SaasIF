import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Save, Send, Trash2 } from 'lucide-react';
import { useSupplierStore } from '@/store/supplierStore';
import { useProductStore } from '@/store/productStore';
import { useAuthStore } from '@/store/authStore';
import { logAudit } from '@/services/auditService';
import { isProdMode } from '@/config/appMode';
import { mirrorPurchase } from '@/services/supabase/supabaseSuppliersService';
import { toast } from '@/store/uiStore';
import { generateId, generatePurchaseNumber } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { formatCurrency, formatMoney } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { Purchase, PurchaseStatus } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

interface LineDraft {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
}

export function PurchaseCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user)!;
  const allSuppliers = useSupplierStore((s) => s.suppliers);
  const allProducts = useProductStore((s) => s.products);
  const suppliers = allSuppliers.filter((x) => x.isActive);
  const products = allProducts.filter((p) => p.isActive);
  const store = useSupplierStore();

  const [supplierId, setSupplierId] = useState(searchParams.get('supplierId') ?? '');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const total = useMemo(() => round2(lines.reduce((acc, l) => acc + l.quantity * l.unitCost, 0)), [lines]);

  const addLine = () => setLines((prev) => [...prev, { id: generateId(), productId: '', quantity: 1, unitCost: 0 }]);

  const setLine = (id: string, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const selectProduct = (lineId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setLine(lineId, { productId, unitCost: product?.costPrice ?? 0 });
  };

  const save = (status: Extract<PurchaseStatus, 'draft' | 'sent'>) => {
    if (!supplierId) return setError('Elegí un proveedor.');
    const valid = lines.filter((l) => l.productId && l.quantity > 0);
    if (valid.length === 0) return setError('Agregá al menos un producto con cantidad.');
    if (valid.some((l) => l.unitCost <= 0)) return setError('El costo unitario debe ser mayor a cero.');

    const supplier = suppliers.find((s) => s.id === supplierId)!;
    const purchase: Purchase = {
      id: generateId(),
      number: generatePurchaseNumber(store.nextPurchaseCounter()),
      supplierId,
      supplierName: supplier.name,
      date: new Date().toISOString(),
      items: valid.map((l) => {
        const product = products.find((p) => p.id === l.productId)!;
        return {
          id: generateId(),
          productId: l.productId,
          productName: product.name,
          quantity: l.quantity,
          unitCost: l.unitCost,
          subtotal: round2(l.quantity * l.unitCost),
        };
      }),
      subtotal: total,
      total,
      status,
      notes,
      createdById: user.id,
      createdByName: user.name,
      receivedAt: null,
    };
    store.addPurchase(purchase);
    if (isProdMode) mirrorPurchase(purchase);
    logAudit({
      action: 'purchase_created',
      module: 'purchases',
      description: `Creó la compra ${purchase.number} (${status === 'draft' ? 'borrador' : 'enviada'}) a ${supplier.name}`,
      severity: 'success',
      metadata: { purchase: purchase.number, total },
    });
    toast.success(`Compra ${purchase.number} guardada`, status === 'sent' ? 'Marcada como enviada al proveedor.' : 'Quedó como borrador.');
    navigate(ROUTES.purchaseDetail(purchase.id));
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader title="Nueva orden de compra" backTo={ROUTES.purchases} />

      <Card className="mb-4">
        <CardHeader title="Proveedor" />
        <CardBody>
          <Select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder="Elegir proveedor…"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            aria-label="Proveedor"
          />
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Productos" subtitle="El costo se precarga desde la ficha del producto" />
        <CardBody className="flex flex-col gap-2">
          {lines.map((line) => {
            return (
              <div key={line.id} className="flex flex-wrap items-center gap-2">
                <Select
                  value={line.productId}
                  onChange={(e) => selectProduct(line.id, e.target.value)}
                  placeholder="Elegir producto…"
                  options={products.map((p) => ({ value: p.id, label: `${p.name} (stock: ${p.stock})` }))}
                  containerClassName="min-w-52 flex-1"
                  aria-label="Producto"
                />
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => setLine(line.id, { quantity: Math.max(1, Number(e.target.value)) })}
                  className="h-10 w-20 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm dark:border-slate-600 dark:bg-slate-800"
                  aria-label="Cantidad"
                />
                <div className="relative">
                  <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs font-semibold text-slate-400">$</span>
                  <input
                    type="number"
                    min={0}
                    value={line.unitCost || ''}
                    onChange={(e) => setLine(line.id, { unitCost: Math.max(0, Number(e.target.value)) })}
                    className="h-10 w-32 rounded-lg border border-slate-300 bg-white pl-6 pr-2 text-sm tabular-nums dark:border-slate-600 dark:bg-slate-800"
                    aria-label="Costo unitario"
                  />
                </div>
                <span className="w-24 text-right text-sm font-bold tabular-nums">
                  {formatMoney(round2(line.quantity * line.unitCost))}
                </span>
                <button
                  onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                  aria-label="Quitar línea"
                  className="cursor-pointer rounded p-1.5 text-slate-300 hover:text-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
          <Button variant="ghost" size="sm" className="self-start" onClick={addLine}>
            <Plus className="size-4" aria-hidden /> Agregar producto
          </Button>
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="font-display font-bold">Total de la orden</span>
            <span className="font-display text-xl font-bold tabular-nums">{formatCurrency(total)}</span>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody className="pt-5">
          <Textarea label="Observación (opcional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardBody>
      </Card>

      {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(ROUTES.purchases)}>Cancelar</Button>
        <Button variant="secondary" onClick={() => save('draft')}>
          <Save className="size-4" aria-hidden />
          Guardar borrador
        </Button>
        <Button onClick={() => save('sent')}>
          <Send className="size-4" aria-hidden />
          Guardar y marcar enviada
        </Button>
      </div>
    </div>
  );
}
