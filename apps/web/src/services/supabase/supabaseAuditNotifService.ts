import type { AppNotification, AuditLog } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useAuditStore } from '@/store/auditStore';
import { useNotificationStore } from '@/store/notificationStore';
import { supabase } from './supabaseClient';

function biz(): string {
  return useAuthStore.getState().businessId ?? '';
}

/** Persiste un evento de auditoría (fire-and-forget; no debe frenar la operación). */
export function mirrorAuditLog(log: AuditLog): void {
  const businessId = biz();
  if (!businessId) return;
  void supabase
    .from('audit_logs')
    .insert({
      id: log.id, businessId, date: log.date, userId: log.userId, userName: log.userName,
      action: log.action, module: log.module, description: log.description, severity: log.severity,
      metadata: log.metadata,
    })
    .then(({ error }) => { if (error) console.error('audit_log insert', error.message); });
}

export function mirrorNotification(n: AppNotification): void {
  const businessId = biz();
  if (!businessId) return;
  void supabase
    .from('notifications')
    .insert({
      id: n.id, businessId, title: n.title, description: n.description, type: n.type,
      read: n.read, date: n.date, actionUrl: n.actionUrl,
    })
    .then(({ error }) => { if (error) console.error('notification insert', error.message); });
}

export function markNotificationReadSupabase(id: string): void {
  void supabase.from('notifications').update({ read: true }).eq('id', id)
    .then(({ error }) => { if (error) console.error('notif read', error.message); });
}

export function markAllNotificationsReadSupabase(): void {
  void supabase.from('notifications').update({ read: true }).eq('read', false)
    .then(({ error }) => { if (error) console.error('notif read-all', error.message); });
}

export async function loadAuditLogs(): Promise<void> {
  if (!biz()) return;
  const { data } = await supabase.from('audit_logs').select('*').order('date', { ascending: false }).limit(500);
  const logs: AuditLog[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    date: (r.date as string) ?? new Date().toISOString(),
    userId: (r.userId as string) ?? '',
    userName: (r.userName as string) ?? '',
    action: (r.action as string) ?? '',
    module: r.module as AuditLog['module'],
    description: (r.description as string) ?? '',
    severity: r.severity as AuditLog['severity'],
    metadata: (r.metadata as AuditLog['metadata']) ?? null,
  }));
  useAuditStore.getState().replaceAll({ logs });
}

export async function loadNotifications(): Promise<void> {
  if (!biz()) return;
  const { data } = await supabase.from('notifications').select('*').order('date', { ascending: false }).limit(200);
  const notifications: AppNotification[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    title: (r.title as string) ?? '',
    description: (r.description as string) ?? '',
    type: r.type as AppNotification['type'],
    read: Boolean(r.read),
    date: (r.date as string) ?? new Date().toISOString(),
    actionUrl: (r.actionUrl as string) ?? null,
  }));
  useNotificationStore.getState().replaceAll({ notifications });
}
