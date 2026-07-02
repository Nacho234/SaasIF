import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, QrCode, Trash2, XCircle } from 'lucide-react';
import type { CartLine, DraftPayment } from '@/services/salesService';
import { confirmSale } from '@/services/salesService';
import type { CartTotals } from '@/utils/calc';
import { round2 } from '@/utils/calc';
import type { Customer, PaymentMethodId } from '@/types';
import { useBusinessStore } from '@/store/businessStore';
import { toast } from '@/store/uiStore';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { formatCurrency } from '@/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/utils/cn';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  totals: CartTotals;
  customer: Customer | null;
  promotionId: string | null;
  discountPercent: number;
  discountAmount: number;
  surcharge: number;
  onSuccess: (saleId: string) => void;
}

interface MixedRow {
  id: number;
  method: PaymentMethodId;
  amount: string;
}

export function PaymentModal(props: PaymentModalProps) {
  const settings = useBusinessStore((s) => s.settings);
  const enabledMethods = PAYMENT_METHODS.filter((m) => settings.enabledPaymentMethods.includes(m.id));

  const [mixed, setMixed] = useState(false);
  const [method, setMethod] = useState<PaymentMethodId>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [reference, setReference] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [installments, setInstallments] = useState(1);
  const [mpStatus, setMpStatus] = useState<'idle' | 'approved' | 'rejected'>('idle');
  const [rows, setRows] = useState<MixedRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = props.totals.total;

  useEffect(() => {
    if (props.open) {
      setMixed(false);
      setMethod('cash');
      setCashReceived('');
      setReference('');
      setCardLast4('');
      setInstallments(1);
      setMpStatus('idle');
      setRows([
        { id: 1, method: 'cash', amount: String(total) },
        { id: 2, method: 'transfer', amount: '' },
      ]);
      setError('');
      setLoading(false);
    }
  }, [props.open, total]);

  const received = Number(cashReceived) || 0;
  const change = method === 'cash' && !mixed ? round2(Math.max(0, received - total)) : 0;

  const mixedTotal = useMemo(() => round2(rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)), [rows]);
  const mixedRemaining = round2(total - mixedTotal);

  const needsMp = (!mixed && method === 'mercado_pago') || (mixed && rows.some((r) => r.method === 'mercado_pago' && Number(r.amount) > 0));

  const buildPayments = (): DraftPayment[] | { error: string } => {
    if (!mixed) {
      if (method === 'cash') {
        if (received < total) return { error: 'El monto recibido no alcanza para cubrir el total.' };
        return [{ method: 'cash', amount: received }];
      }
      if (method === 'customer_credit' && !props.customer) {
        return { error: 'Para vender a cuenta corriente tenés que seleccionar un cliente.' };
      }
      if (method === 'mercado_pago' && mpStatus !== 'approved') {
        return { error: 'Simulá la aprobación del pago con QR antes de confirmar.' };
      }
      return [
        {
          method,
          amount: total,
          reference: method === 'transfer' ? reference : undefined,
          cardLast4: method === 'debit_card' || method === 'credit_card' ? cardLast4 : undefined,
          installments: method === 'credit_card' ? installments : undefined,
        },
      ];
    }
    const active = rows.filter((r) => Number(r.amount) > 0);
    if (active.length === 0) return { error: 'Ingresá al menos un pago.' };
    if (mixedTotal < total) return { error: `El pago mixto no coincide con el total: faltan ${formatCurrency(mixedRemaining)}.` };
    const nonCashOver = round2(active.filter((r) => r.method !== 'cash').reduce((a, r) => a + Number(r.amount), 0));
    if (mixedTotal > total && nonCashOver > total) {
      return { error: 'El pago mixto no coincide con el total: solo el efectivo puede tener vuelto.' };
    }
    if (active.some((r) => r.method === 'customer_credit') && !props.customer) {
      return { error: 'Para usar cuenta corriente tenés que seleccionar un cliente.' };
    }
    if (needsMp && mpStatus !== 'approved') {
      return { error: 'Simulá la aprobación del pago con QR antes de confirmar.' };
    }
    return active.map((r) => ({ method: r.method, amount: Number(r.amount) }));
  };

  const confirm = () => {
    const payments = buildPayments();
    if ('error' in payments) {
      setError(payments.error);
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = confirmSale({
        items: props.lines,
        customerId: props.customer?.id ?? null,
        discountPercent: props.discountPercent,
        discountAmount: props.discountAmount,
        surcharge: props.surcharge,
        payments,
        cashReceived: !mixed && method === 'cash' ? received : null,
        notes: '',
        promotionId: props.promotionId,
      });
      setLoading(false);
      if (result.ok && result.sale) {
        toast.success(`Venta ${result.sale.saleNumber} confirmada`, change > 0 ? `Vuelto: ${formatCurrency(change)}` : undefined);
        props.onSuccess(result.sale.id);
      } else {
        setError(result.error ?? 'No se pudo confirmar la venta.');
      }
    }, 400);
  };

  const quickBills = [total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000]
    .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
    .slice(0, 4);

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Cobrar venta"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={props.onClose}>
            Cancelar
          </Button>
          <Button size="lg" onClick={confirm} loading={loading}>
            Confirmar venta · {formatCurrency(total)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Total */}
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-5 py-4 text-white dark:bg-slate-800">
          <span className="text-sm font-medium text-slate-300">Total a cobrar</span>
          <span className="font-display text-3xl font-bold tabular-nums">{formatCurrency(total)}</span>
        </div>

        {/* Selector simple / mixto */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Método de pago</p>
          <button
            onClick={() => setMixed((m) => !m)}
            className="cursor-pointer text-xs font-semibold text-primary-600 hover:underline"
          >
            {mixed ? '← Volver a pago simple' : 'Pago mixto (dividir entre métodos)'}
          </button>
        </div>

        {!mixed ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {enabledMethods.map((m) => {
                const disabled = m.id === 'customer_credit' && (!settings.allowCustomerCredit || !props.customer);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMethod(m.id);
                      setMpStatus('idle');
                      setError('');
                    }}
                    disabled={disabled}
                    title={disabled ? 'Requiere seleccionar un cliente' : undefined}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                      method === m.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950 dark:text-primary-300'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300',
                    )}
                  >
                    <m.icon className="size-5" aria-hidden />
                    <span className="text-xs font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Campos por método */}
            {method === 'cash' && (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <Input
                  label="Monto recibido"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  leftIcon={<span className="text-sm font-semibold">$</span>}
                  autoFocus
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickBills.map((v) => (
                    <button
                      key={v}
                      onClick={() => setCashReceived(String(v))}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {formatCurrency(v)}
                    </button>
                  ))}
                </div>
                {received >= total && (
                  <p className="mt-3 flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <span>Vuelto</span>
                    <span className="tabular-nums">{formatCurrency(change)}</span>
                  </p>
                )}
              </div>
            )}

            {method === 'transfer' && (
              <Input
                label="Referencia / comprobante (opcional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: TRF-12345"
              />
            )}

            {(method === 'debit_card' || method === 'credit_card') && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Últimos 4 dígitos (opcional)"
                  value={cardLast4}
                  maxLength={4}
                  inputMode="numeric"
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                />
                {method === 'credit_card' && (
                  <Select
                    label="Cuotas"
                    value={String(installments)}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    options={[1, 3, 6, 12].map((n) => ({ value: String(n), label: n === 1 ? '1 pago' : `${n} cuotas` }))}
                  />
                )}
              </div>
            )}

            {method === 'customer_credit' && props.customer && (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Se registrará una deuda de <strong>{formatCurrency(total)}</strong> en la cuenta corriente de{' '}
                <strong>{props.customer.name}</strong>
                {props.customer.debtBalance > 0 && <> (deuda actual: {formatCurrency(props.customer.debtBalance)})</>}.
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <Select
                  value={row.method}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, method: e.target.value as PaymentMethodId } : r)))
                  }
                  options={enabledMethods.map((m) => ({ value: m.id, label: m.label }))}
                  containerClassName="flex-1"
                  aria-label="Método"
                />
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)))}
                  containerClassName="w-36"
                  leftIcon={<span className="text-sm font-semibold">$</span>}
                  aria-label="Monto"
                />
                <button
                  onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                  aria-label="Quitar pago"
                  className="cursor-pointer rounded p-1.5 text-slate-300 hover:text-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { id: Date.now(), method: 'cash', amount: '' }])}
              className="self-start"
            >
              <Plus className="size-4" aria-hidden /> Agregar pago
            </Button>
            <div
              className={cn(
                'flex justify-between rounded-xl px-4 py-2.5 text-sm font-bold',
                mixedRemaining === 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : mixedRemaining > 0
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
              )}
            >
              <span>
                {mixedRemaining === 0 ? 'Pago completo' : mixedRemaining > 0 ? 'Falta cubrir' : 'Excedente (vuelto en efectivo)'}
              </span>
              <span className="tabular-nums">{formatCurrency(Math.abs(mixedRemaining))}</span>
            </div>
          </div>
        )}

        {/* Simulación Mercado Pago */}
        {needsMp && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/50">
            <div className="flex size-28 items-center justify-center rounded-xl bg-white shadow-card dark:bg-slate-800">
              <QrCode className="size-20 text-slate-800 dark:text-slate-200" aria-label="QR de pago simulado" />
            </div>
            <p className="text-xs text-sky-700 dark:text-sky-300">
              El cliente escanea el QR con Mercado Pago (simulado, sin conexión real).
            </p>
            {mpStatus === 'approved' ? (
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                <CheckCircle2 className="size-4" /> Pago aprobado
              </p>
            ) : mpStatus === 'rejected' ? (
              <p className="flex items-center gap-1.5 text-sm font-bold text-red-600">
                <XCircle className="size-4" /> Pago rechazado — reintentá
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button size="sm" variant="success" onClick={() => setMpStatus('approved')}>
                Simular pago aprobado
              </Button>
              <Button size="sm" variant="outline-danger" onClick={() => setMpStatus('rejected')}>
                Simular rechazo
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <p className="text-center text-[11px] text-slate-400">
          {PAYMENT_METHOD_LABELS[method]} · Podés cancelar con Esc · Confirmá con el botón
        </p>
      </div>
    </Modal>
  );
}
