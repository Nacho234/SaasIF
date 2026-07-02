import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { closeRegister, getRegisterSummary } from '@/services/cashRegisterService';
import type { CashRegister } from '@/types';
import { toast, useUiStore } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { formatCurrency } from '@/utils/format';
import { round2 } from '@/utils/calc';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { cn } from '@/utils/cn';

export function CloseCashModal({
  open,
  onClose,
  register,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  register: CashRegister;
  onClosed?: () => void;
}) {
  const askConfirm = useUiStore((s) => s.askConfirm);
  const summary = useMemo(() => getRegisterSummary(register.id), [register.id, open]);
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const countedValue = counted === '' ? null : Number(counted);
  const difference = countedValue != null && !Number.isNaN(countedValue) ? round2(countedValue - summary.expectedCash) : null;

  const submit = () => {
    if (countedValue == null || Number.isNaN(countedValue)) {
      setError('Ingresá el efectivo contado.');
      return;
    }
    askConfirm({
      title: 'Cerrar caja',
      message:
        difference === 0
          ? 'El efectivo contado coincide con el esperado. ¿Cerrar la caja?'
          : `Hay una diferencia de ${formatCurrency(difference ?? 0)}. ¿Cerrar la caja igualmente?`,
      confirmLabel: 'Cerrar caja',
      danger: difference !== 0,
      onConfirm: () => {
        const result = closeRegister({ countedCash: countedValue, notes });
        if (result.ok) {
          toast.success('Caja cerrada', difference === 0 ? 'Cierre sin diferencias. ¡Buen trabajo!' : 'Cierre registrado con diferencia.');
          onClose();
          onClosed?.();
        } else {
          setError(result.error ?? 'No se pudo cerrar la caja.');
        }
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cerrar caja ${register.number}`}
      description="Verificá los totales por método antes de confirmar el cierre."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submit}>
            <Lock className="size-4" aria-hidden />
            Cerrar caja
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Resumen automático */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500">Ventas del turno</p>
            <p className="font-display text-lg font-bold tabular-nums">{summary.salesCount} ventas · {formatCurrency(summary.salesTotal)}</p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
              {Object.entries(summary.salesByMethod).map(([method, amount]) => (
                <li key={method} className="flex justify-between">
                  <span>{PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS]}</span>
                  <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500">Movimientos</p>
            <ul className="mt-1 flex flex-col gap-1 text-xs text-slate-500">
              <li className="flex justify-between"><span>Monto inicial</span><span className="tabular-nums">{formatCurrency(register.openingAmount)}</span></li>
              <li className="flex justify-between"><span>Ingresos manuales</span><span className="tabular-nums">{formatCurrency(summary.manualIncome)}</span></li>
              <li className="flex justify-between"><span>Pagos de deuda</span><span className="tabular-nums">{formatCurrency(summary.debtPayments)}</span></li>
              <li className="flex justify-between text-red-600 dark:text-red-400"><span>Gastos y egresos</span><span className="tabular-nums">-{formatCurrency(summary.expensesTotal)}</span></li>
              <li className="flex justify-between text-red-600 dark:text-red-400"><span>Retiros</span><span className="tabular-nums">-{formatCurrency(summary.withdrawals)}</span></li>
              <li className="flex justify-between text-red-600 dark:text-red-400"><span>Devoluciones y anulaciones</span><span className="tabular-nums">-{formatCurrency(round2(summary.refunds + summary.cancellations))}</span></li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-primary-50 px-4 py-3 dark:bg-primary-950">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-900 dark:text-primary-200">Efectivo esperado en el cajón</span>
            <span className="font-display text-xl font-bold text-primary-900 tabular-nums dark:text-primary-100">
              {formatCurrency(summary.expectedCash)}
            </span>
          </div>
        </div>

        <Input
          label="Efectivo contado"
          required
          type="number"
          min={0}
          inputMode="decimal"
          value={counted}
          onChange={(e) => {
            setCounted(e.target.value);
            setError('');
          }}
          error={error || undefined}
          leftIcon={<span className="text-sm font-semibold">$</span>}
          placeholder="Contá el efectivo real del cajón"
          autoFocus
        />

        {difference != null && (
          <div
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-semibold',
              difference === 0
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
            )}
          >
            {difference === 0
              ? 'Sin diferencia: el efectivo coincide.'
              : `Diferencia: ${difference > 0 ? '+' : ''}${formatCurrency(difference)} ${difference > 0 ? '(sobrante)' : '(faltante)'}`}
          </div>
        )}

        <Textarea
          label={difference !== 0 && difference != null ? 'Observaciones (obligatorio por la diferencia)' : 'Observaciones'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: se pagó flete en efectivo sin registrar"
          rows={2}
        />
      </div>
    </Modal>
  );
}
