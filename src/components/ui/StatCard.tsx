import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Card } from './Card';

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const toneClasses = {
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }[tone];

  return (
    <Card className={cn('flex items-center gap-4 p-4', className)}>
      {Icon && (
        <span className={cn('rounded-xl p-2.5', toneClasses)}>
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate font-display text-lg font-bold text-slate-900 tabular-nums dark:text-slate-50">
          {value}
        </p>
        {hint && <p className="truncate text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
    </Card>
  );
}
