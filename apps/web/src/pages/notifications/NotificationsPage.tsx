import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { isProdMode } from '@/config/appMode';
import { markAllNotificationsReadSupabase, markNotificationReadSupabase } from '@/services/supabase/supabaseAuditNotifService';
import { formatTimeAgo } from '@/utils/format';
import { NOTIFICATION_TYPE_LABELS } from '@/constants/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';

export function NotificationsPage() {
  const navigate = useNavigate();
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [tab, setTab] = useState('unread');

  const unread = notifications.filter((n) => !n.read);
  const visible = useMemo(() => (tab === 'unread' ? unread : notifications), [tab, notifications, unread]);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <PageHeader
        title="Notificaciones"
        subtitle={unread.length ? `${unread.length} sin leer` : 'Estás al día'}
        actions={
          unread.length > 0 && (
            <Button variant="secondary" onClick={() => { markAllRead(); if (isProdMode) markAllNotificationsReadSupabase(); }}>
              <CheckCheck className="size-4" aria-hidden />
              Marcar todas leídas
            </Button>
          )
        }
      />

      <Tabs
        className="mb-4"
        tabs={[
          { id: 'unread', label: 'Sin leer', count: unread.length },
          { id: 'all', label: 'Todas', count: notifications.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card>
        {visible.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={tab === 'unread' ? 'No tenés notificaciones pendientes' : 'No hay notificaciones'}
            description="Las alertas de stock, caja y deudas van a aparecer acá."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    markRead(n.id);
                    if (isProdMode) markNotificationReadSupabase(n.id);
                    if (n.actionUrl) navigate(n.actionUrl);
                  }}
                  className="flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary-500')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm', n.read ? 'text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-900 dark:text-slate-100')}>
                      {n.title}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{n.description}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{formatTimeAgo(n.date)}</span>
                  </span>
                  <Badge>{NOTIFICATION_TYPE_LABELS[n.type]}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
