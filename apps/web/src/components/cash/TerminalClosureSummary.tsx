import { Trash2 } from 'lucide-react';
import type { TerminalClosure } from '@/types';
import { PROCESSOR_LABELS } from '@/constants/labels';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';

function DiffRow({ label, system, terminal, diff }: { label: string; system: number; terminal: number; diff: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(system)}</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(terminal)}</span>
      <span className={cn('text-right font-semibold tabular-nums', diff === 0 ? 'text-emerald-600' : 'text-amber-600')}>
        {diff > 0 ? '+' : ''}
        {formatCurrency(diff)}
      </span>
    </div>
  );
}

export function TerminalClosureSummary({
  terminal,
  onRemove,
}: {
  terminal: TerminalClosure;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {PROCESSOR_LABELS[terminal.processor]} · {terminal.terminalLabel}
          </p>
          <p className="text-xs text-slate-400">
            {terminal.batchNumber ? `Lote ${terminal.batchNumber}` : 'Sin lote'}
            {terminal.closingNumber ? ` · Cierre ${terminal.closingNumber}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-bold tabular-nums', terminal.totalDifference === 0 ? 'text-emerald-600' : 'text-amber-600')}>
            {terminal.totalDifference > 0 ? '+' : ''}
            {formatCurrency(terminal.totalDifference)}
          </span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
              aria-label="Quitar terminal"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-slate-100 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:border-slate-800">
        <span>Medio</span>
        <span>Sistema</span>
        <span>Terminal</span>
        <span className="text-right">Dif.</span>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        <DiffRow label="Débito" system={terminal.systemDebit} terminal={terminal.terminalDebit} diff={terminal.debitDifference} />
        <DiffRow label="Crédito" system={terminal.systemCredit} terminal={terminal.terminalCredit} diff={terminal.creditDifference} />
        <DiffRow label="QR / MP" system={terminal.systemQr} terminal={terminal.terminalQr} diff={terminal.qrDifference} />
      </div>
      {terminal.notes && <p className="mt-2 text-xs text-slate-500">Obs: {terminal.notes}</p>}
    </div>
  );
}
