import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { useAuditStore } from '@/store/auditStore';
import { useUserStore } from '@/store/userStore';
import { formatFriendlyDateTime } from '@/utils/format';
import type { AuditLog, AuditModule, AuditSeverity } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';

const MODULE_LABELS: Record<AuditModule, string> = {
  auth: 'Sesión',
  cash: 'Caja',
  sales: 'Ventas',
  returns: 'Devoluciones',
  products: 'Productos',
  inventory: 'Inventario',
  customers: 'Clientes',
  suppliers: 'Proveedores',
  purchases: 'Compras',
  promotions: 'Promociones',
  expenses: 'Gastos',
  users: 'Usuarios',
  settings: 'Configuración',
  system: 'Sistema',
};

const SEVERITY_VARIANT: Record<AuditSeverity, 'info' | 'success' | 'warning' | 'danger'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
};

export function AuditPage() {
  const logs = useAuditStore((s) => s.logs);
  const users = useUserStore((s) => s.users);
  const [userFilter, setUserFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      logs.filter(
        (l) =>
          (!userFilter || l.userId === userFilter) &&
          (!moduleFilter || l.module === moduleFilter) &&
          (!severityFilter || l.severity === severityFilter),
      ),
    [logs, userFilter, moduleFilter, severityFilter],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Auditoría" subtitle={`${filtered.length} eventos registrados (se conservan los últimos 500)`} />

      <Card className="mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
        <Select
          label="Usuario"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="Todos"
          options={[{ value: 'system', label: 'Sistema' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
        />
        <Select
          label="Módulo"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          placeholder="Todos"
          options={(Object.keys(MODULE_LABELS) as AuditModule[]).map((m) => ({ value: m, label: MODULE_LABELS[m] }))}
        />
        <Select
          label="Severidad"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          placeholder="Todas"
          options={[
            { value: 'info', label: 'Info' },
            { value: 'success', label: 'Éxito' },
            { value: 'warning', label: 'Advertencia' },
            { value: 'error', label: 'Error' },
          ]}
        />
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={History} title="No hay actividad registrada" description="Los eventos del sistema van a aparecer acá." />
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.slice(0, 150).map((log: AuditLog) => (
              <li key={log.id}>
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="flex w-full cursor-pointer flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      log.severity === 'success' && 'bg-emerald-500',
                      log.severity === 'info' && 'bg-sky-500',
                      log.severity === 'warning' && 'bg-amber-500',
                      log.severity === 'error' && 'bg-red-500',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{log.description}</span>
                    <span className="block text-xs text-slate-400">
                      {formatFriendlyDateTime(log.date)} · {log.userName}
                    </span>
                  </span>
                  <Badge variant={SEVERITY_VARIANT[log.severity]}>{MODULE_LABELS[log.module]}</Badge>
                </button>
                {expanded === log.id && (
                  <div className="bg-slate-50 px-9 py-3 text-xs dark:bg-slate-800/40">
                    <p className="text-slate-500">
                      Acción: <code className="rounded bg-slate-200 px-1 py-0.5 dark:bg-slate-700">{log.action}</code>
                    </p>
                    {log.metadata && (
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-slate-200">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
