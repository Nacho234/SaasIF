-- =====================================================================
-- Auditoría + notificaciones persistentes. RLS por businessId.
-- audit_logs: solo insert/select (log inmutable). notifications: +update (marcar leída).
-- =====================================================================

create table if not exists public.audit_logs (
  id           text primary key default gen_random_uuid()::text,
  "businessId" text not null references public.businesses(id) on delete cascade,
  date         timestamptz not null default now(),
  "userId"     text default '',
  "userName"   text default '',
  action       text default '',
  module       text default '',
  description  text default '',
  severity     text default 'info',
  metadata     jsonb
);
create index if not exists audit_logs_business_idx on public.audit_logs("businessId", date desc);

create table if not exists public.notifications (
  id           text primary key default gen_random_uuid()::text,
  "businessId" text not null references public.businesses(id) on delete cascade,
  title        text default '',
  description  text default '',
  type         text default 'info',
  read         boolean default false,
  date         timestamptz not null default now(),
  "actionUrl"  text
);
create index if not exists notifications_business_idx on public.notifications("businessId", date desc);

grant select, insert on public.audit_logs to authenticated;
grant select, insert, update on public.notifications to authenticated;

alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_select on public.audit_logs;
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select using ("businessId" = public.auth_business_id());
create policy audit_logs_insert on public.audit_logs for insert with check ("businessId" = public.auth_business_id());

alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_update on public.notifications;
create policy notifications_select on public.notifications for select using ("businessId" = public.auth_business_id());
create policy notifications_insert on public.notifications for insert with check ("businessId" = public.auth_business_id());
create policy notifications_update on public.notifications for update using ("businessId" = public.auth_business_id()) with check ("businessId" = public.auth_business_id());
