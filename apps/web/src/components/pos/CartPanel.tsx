import { useState } from 'react';
import { BadgePercent, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import type { CartLine } from '@/services/salesService';
import type { CartTotals } from '@/utils/calc';
import type { Customer } from '@/types';
import { useBusinessStore } from '@/store/businessStore';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatMoney } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { CustomerPicker } from './CustomerPicker';
import { cn } from '@/utils/cn';

interface CartPanelProps {
  lines: CartLine[];
  totals: CartTotals;
  customer: Customer | null;
  onCustomerChange: (customer: Customer | null) => void;
  discountPercent: number;
  discountAmount: number;
  onDiscountPercent: (value: number) => void;
  onDiscountAmount: (value: number) => void;
  surcharge: number;
  onSurcharge: (value: number) => void;
  onChangeQuantity: (lineId: string, delta: number) => void;
  onRemoveLine: (lineId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  sellerName: string;
  registerNumber: string | null;
  /** Sin card contenedora (para usar dentro de un drawer). */
  bare?: boolean;
}

export function CartPanel(props: CartPanelProps) {
  const { can } = usePermissions();
  const settings = useBusinessStore((s) => s.settings);
  const [showDiscount, setShowDiscount] = useState(false);
  const canDiscount = settings.allowDiscounts && can('create_discount');

  const content = (
    <div className="flex h-full flex-col">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <p className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Venta actual</p>
          <p className="text-xs text-slate-400">
            {props.sellerName}
            {props.registerNumber ? ` · ${props.registerNumber}` : ''}
          </p>
        </div>
        {props.lines.length > 0 && (
          <button
            onClick={props.onClear}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Vaciar
          </button>
        )}
      </div>

      {/* Cliente */}
      <div className="border-b border-slate-100 py-3 dark:border-slate-800">
        <CustomerPicker customer={props.customer} onChange={props.onCustomerChange} />
      </div>

      {/* Ítems */}
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {props.lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ShoppingCart className="size-8 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-slate-500">El carrito está vacío</p>
            <p className="text-xs text-slate-400">Tocá un producto para agregarlo</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {props.lines.map((line) => (
              <li key={line.lineId} className="flex items-center gap-2 rounded-xl px-1 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{line.name}</p>
                  <p className="text-xs text-slate-400 tabular-nums">
                    {formatMoney(line.unitPrice)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => props.onChangeQuantity(line.lineId, -1)}
                    aria-label="Restar unidad"
                    className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                  <button
                    onClick={() => props.onChangeQuantity(line.lineId, 1)}
                    aria-label="Sumar unidad"
                    className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <p className="w-20 text-right text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatMoney(line.quantity * line.unitPrice)}
                </p>
                <button
                  onClick={() => props.onRemoveLine(line.lineId)}
                  aria-label={`Quitar ${line.name}`}
                  className="cursor-pointer rounded p-1 text-slate-300 transition-colors hover:text-red-500"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Descuentos */}
      {canDiscount && (
        <div className="border-t border-slate-100 py-2.5 dark:border-slate-800">
          <button
            onClick={() => setShowDiscount((s) => !s)}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline"
          >
            <BadgePercent className="size-3.5" aria-hidden />
            {showDiscount ? 'Ocultar descuentos' : 'Descuento / recargo'}
          </button>
          {showDiscount && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-500">
                Desc. %
                <input
                  type="number"
                  min={0}
                  max={settings.maxDiscountPercent}
                  value={props.discountPercent || ''}
                  onChange={(e) =>
                    props.onDiscountPercent(Math.min(settings.maxDiscountPercent, Math.max(0, Number(e.target.value))))
                  }
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  placeholder="0"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-500">
                Desc. $
                <input
                  type="number"
                  min={0}
                  value={props.discountAmount || ''}
                  onChange={(e) => props.onDiscountAmount(Math.max(0, Number(e.target.value)))}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  placeholder="0"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-500">
                Recargo $
                <input
                  type="number"
                  min={0}
                  value={props.surcharge || ''}
                  onChange={(e) => props.onSurcharge(Math.max(0, Number(e.target.value)))}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  placeholder="0"
                />
              </label>
              <p className="col-span-3 text-[11px] text-slate-400">Descuento máximo permitido: {settings.maxDiscountPercent}%</p>
            </div>
          )}
        </div>
      )}

      {/* Totales */}
      <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatCurrency(props.totals.subtotal)}</dd>
          </div>
          {props.totals.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <dt>Descuento</dt>
              <dd className="tabular-nums">−{formatCurrency(props.totals.discountTotal)}</dd>
            </div>
          )}
          {props.totals.surchargeTotal > 0 && (
            <div className="flex justify-between text-slate-500">
              <dt>Recargo</dt>
              <dd className="tabular-nums">+{formatCurrency(props.totals.surchargeTotal)}</dd>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
            <dt className="font-display text-base font-bold text-slate-900 dark:text-slate-100">Total</dt>
            <dd className="font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-50">
              {formatCurrency(props.totals.total)}
            </dd>
          </div>
        </dl>
        <Button size="xl" fullWidth className="mt-3" onClick={props.onCheckout} disabled={props.lines.length === 0}>
          Cobrar {props.totals.total > 0 ? formatMoney(props.totals.total) : ''} (F4)
        </Button>
      </div>
    </div>
  );

  if (props.bare) return content;
  return (
    <div
      className={cn(
        'h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900',
      )}
    >
      {content}
    </div>
  );
}
