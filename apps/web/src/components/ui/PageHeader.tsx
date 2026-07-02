import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function PageHeader({
  title,
  subtitle,
  actions,
  backTo,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className={cn('mb-5 flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            aria-label="Volver"
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-50">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
