import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';

export interface BarDatum {
  label: string;
  value: number;
  hint?: string;
}

/** Gráfico de barras horizontales, liviano y accesible. */
export function SimpleBarChart({
  data,
  formatValue = formatMoney,
  className,
}: {
  data: BarDatum[];
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn('flex flex-col gap-3', className)} role="img" aria-label="Gráfico de barras">
      {data.map((d, i) => (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">{d.label}</span>
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums dark:text-slate-100">
              {formatValue(d.value)}
              {d.hint && <span className="ml-1.5 text-xs font-normal text-slate-400">{d.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-primary-500 transition-[width] duration-500"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
