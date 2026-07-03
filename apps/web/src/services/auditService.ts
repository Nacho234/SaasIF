import type { AuditModule, AuditSeverity } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useAuditStore } from '@/store/auditStore';
import { generateId } from '@/utils/id';
import { isProdMode } from '@/config/appMode';
import { mirrorAuditLog } from './supabase/supabaseAuditNotifService';

interface LogInput {
  action: string;
  module: AuditModule;
  description: string;
  severity?: AuditSeverity;
  metadata?: Record<string, string | number | boolean | null>;
}

export function logAudit(input: LogInput): void {
  const user = useAuthStore.getState().user;
  const log = {
    id: generateId(),
    date: new Date().toISOString(),
    userId: user?.id ?? 'system',
    userName: user?.name ?? 'Sistema',
    action: input.action,
    module: input.module,
    description: input.description,
    severity: input.severity ?? 'info',
    metadata: input.metadata ?? null,
  };
  useAuditStore.getState().addLog(log);
  if (isProdMode) mirrorAuditLog(log);
}

/** Registra un intento de acceso a un módulo sin permisos. */
export function logBlockedAccess(path: string): void {
  logAudit({
    action: 'access_blocked',
    module: 'auth',
    description: `Intento de acceso sin permisos a ${path}`,
    severity: 'warning',
    metadata: { path },
  });
}
