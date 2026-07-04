-- =====================================================================
-- Estados temporales del OAuth de Mercado Pago (anti-CSRF). Un state aleatorio
-- por intento de conexión, atado al businessId. Solo lo tocan las Edge Functions
-- (service_role). El frontend NO tiene acceso (revocado + RLS sin políticas).
-- =====================================================================

create table if not exists public.mp_oauth_states (
  state        text primary key,
  "businessId" text not null references public.businesses(id) on delete cascade,
  "createdAt"  timestamptz not null default now()
);

revoke all on public.mp_oauth_states from anon;
revoke all on public.mp_oauth_states from authenticated;

alter table public.mp_oauth_states enable row level security;
-- Sin políticas: anon/authenticated no pueden ni leer ni escribir. service_role saltea RLS.
