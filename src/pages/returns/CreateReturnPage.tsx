import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Search, Undo2 } from 'lucide-react';
import { useSalesStore } from '@/store/salesStore';
import { createReturn } from '@/services/returnService';
import { toast, useUiStore } from '@/store/uiStore';
import { formatCurrency, formatFriendlyDateTime } from '@/utils/format';
import { round2 } from '@/utils/calc';
import { ROUTES } from '@/constants/routes';
import { REFUND_METHOD_LABELS, RETURN_REASON_LABELS } from '@/constants/labels';
import type { RefundMethod, ReturnReason, Sale } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { SaleStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface DraftItem {
  saleItemId: string;
  quantity: number;
  restock: boolean;
}

export function CreateReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sales = useSalesStore((s) => s.sales);
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [query, setQuery] = useState('');
  const [saleId, setSaleId] = useState<string | null>(searchParams.get('saleId'));
  const [items, setItems] = useState<Record<string, DraftItem>>({});
  const [reason, setReason] = useState<ReturnReason>('defective');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('cash');
  const [notes, setNotes] = useState('');

  const sale = sales.find((s) => s.id === saleId) ?? null;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales.slice(0, 6);
    return sales
      .filter((s) => s.saleNumber.toLowerCase().includes(q) || (s.customerName ?? '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [sales, query]);

  const refundTotal = useMemo(() => {
    if (!sale) return 0;
    return round2(
      Object.values(items).reduce((acc, draft) => {
        const saleItem = sale.items.find((i) => i.id === draft.saleItemId);
        return acc + (saleItem ? draft.quantity * saleItem.unitPrice : 0);
      }, 0),
    );
  }, [items, sale]);

  const selectSale = (s: Sale) => {
    if (s.status === 'cancelled') {
      toast.error('No se puede devolver una venta anulada.');
      return;
    }
    setSaleId(s.id);
    setItems({});
  };

  const setItemQty = (saleItemId: string, quantity: number, max: number) => {
    setItems((prev) => {
      const next = { ...prev };
      const qty = Math.max(0, Math.min(max, quantity));
      if (qty === 0) delete next[saleItemId];
      else next[saleItemId] = { saleItemId, quantity: qty, restock: prev[saleItemId]?.restock ?? true };
      return next;
    });
  };

  const submit = () => {
    if (!sale) return;
    const selected = Object.values(items).filter((i) => i.quantity > 0);
    if (selected.length === 0) {
      toast.error('Seleccioná al menos un producto a devolver.');
      return;
    }
    askConfirm({
      title: 'Registrar devolución',
      message:
        refundMethod === 'cash' || refundMethod === 'transfer'
          ? `Se devuelve ${formatCurrency(refundTotal)} al cliente y se ajusta la caja. ¿Confirmar?`
          : '¿Confirmar la devolución con los productos seleccionados?',
      confirmLabel: 'Confirmar devolución',
      onConfirm: () => {
        const result = createReturn({
          saleId: sale.id,
          items: selected.map((draft) => {
            const saleItem = sale.items.find((i) => i.id === draft.saleItemId)!;
            return {
              saleItemId: draft.saleItemId,
              productId: saleItem.productId,
              productName: saleItem.productName,
              quantity: draft.quantity,
              unitPrice: saleItem.unitPrice,
              restock: draft.restock,
            };
          }),
          reason,
          refundMethod,
          notes,
        });
        if (result.ok) {
          toast.success('Devolución registrada', 'El stock y la caja fueron actualizados.');
          navigate(ROUTES.saleDetail(sale.id));
        } else {
          toast.error('No se pudo registrar', result.error);
        }
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader title="Nueva devolución" subtitle="Buscá la venta, elegí los productos y definí cómo se devuelve" backTo={ROUTES.returns} />

      {/* Paso 1: buscar venta */}
      <Card className="mb-4">
        <CardHeader title="1 · Venta original" />
        <CardBody>
          {sale ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-50 px-4 py-3 dark:bg-primary-950">
              <div>
                <p className="font-semibold text-primary-900 dark:text-primary-200">
                  {sale.saleNumber} · {sale.customerName ?? 'Consumidor final'}
                </p>
                <p className="text-xs text-primary-700 dark:text-primary-300">
                  {formatFriendlyDateTime(sale.date)} · Total {formatCurrency(sale.total)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SaleStatusBadge status={sale.status} />
                <Button size="sm" variant="secondary" onClick={() => setSaleId(null)}>
                  Cambiar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Input
                leftIcon={<Search className="size-4" />}
                placeholder="Buscar por número de venta (V-00012) o cliente…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <ul className="mt-3 flex flex-col gap-1">
                {searchResults.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => selectSale(s)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span>
                        <span className="block text-sm font-semibold">{s.saleNumber} · {s.customerName ?? 'Consumidor final'}</span>
                        <span className="block text-xs text-slate-400">{formatFriendlyDateTime(s.date)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <SaleStatusBadge status={s.status} />
                        <span className="font-bold tabular-nums">{formatCurrency(s.total)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardBody>
      </Card>

      {/* Paso 2: productos */}
      {sale && (
        <>
          <Card className="mb-4">
            <CardHeader title="2 · Productos a devolver" subtitle="Indicá cantidad y si vuelve al stock" />
            <CardBody>
              {sale.items.every((i) => i.quantity <= i.returnedQuantity) ? (
                <EmptyState icon={Undo2} title="Ya se devolvió todo" description="Esta venta no tiene unidades pendientes de devolución." className="py-6" />
              ) : (
                <ul className="flex flex-col gap-3">
                  {sale.items.map((item) => {
                    const remaining = item.quantity - item.returnedQuantity;
                    const draft = items[item.id];
                    if (remaining <= 0) return null;
                    return (
                      <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{item.productName}</p>
                          <p className="text-xs text-slate-400">
                            {formatCurrency(item.unitPrice)} c/u · quedan {remaining} por devolver
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          Cantidad
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={draft?.quantity ?? 0}
                            onChange={(e) => setItemQty(item.id, Number(e.target.value), remaining)}
                            className="h-9 w-16 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm tabular-nums dark:border-slate-600 dark:bg-slate-800"
                          />
                        </label>
                        {draft && draft.quantity > 0 && (
                          <Switch
                            checked={draft.restock}
                            onChange={(v) => setItems((prev) => ({ ...prev, [item.id]: { ...draft, restock: v } }))}
                            label="Vuelve al stock"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Paso 3: motivo y método */}
          <Card className="mb-4">
            <CardHeader title="3 · Motivo y devolución" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Motivo"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReturnReason)}
                options={(Object.keys(RETURN_REASON_LABELS) as ReturnReason[]).map((r) => ({ value: r, label: RETURN_REASON_LABELS[r] }))}
              />
              <Select
                label="Método de devolución"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
                options={(Object.keys(REFUND_METHOD_LABELS) as RefundMethod[]).map((r) => ({ value: r, label: REFUND_METHOD_LABELS[r] }))}
              />
              <Textarea
                label="Observación (opcional)"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                containerClassName="sm:col-span-2"
              />
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2 dark:bg-slate-800/60">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {refundMethod === 'none' || refundMethod === 'exchange' ? 'Sin reintegro monetario' : 'Reintegro al cliente'}
                </span>
                <span className="font-display text-xl font-bold tabular-nums">
                  {refundMethod === 'none' || refundMethod === 'exchange' ? '—' : formatCurrency(refundTotal)}
                </span>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate(ROUTES.returns)}>Cancelar</Button>
            <Button size="lg" onClick={submit}>
              <Check className="size-4" aria-hidden />
              Confirmar devolución
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
