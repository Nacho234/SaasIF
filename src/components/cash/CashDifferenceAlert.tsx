import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';

/** Muestra el estado de la diferencia de caja (ok / sobrante / faltante). */
export function CashDifferenceAlert({ difference }: { difference: number | null }) {
  if (difference == null) return null;
  const ok = difference === 0;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
        ok
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      )}
    >
      {ok ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <AlertTriangle className="size-4 shrink-0" aria-hidden />}
      {ok
        ? 'Sin diferencia: el efectivo coincide con lo esperado.'
        : `Diferencia: ${difference > 0 ? '+' : ''}${formatCurrency(difference)} ${difference > 0 ? '(sobrante)' : '(faltante)'}`}
    </div>
  );
}
