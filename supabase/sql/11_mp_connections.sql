-- =====================================================================
-- Conexión de Mercado Pago por negocio (OAuth). El token de cada negocio se
-- guarda acá pero NO es legible por el frontend: solo la Edge Function
-- (service_role) lee accessToken/refreshToken. El usuario solo ve si está
-- conectado + el nickname (grants por columna).
-- =====================================================================

create table if not exists public.mp_connections (
  id             text primary key default gen_random_uuid()::text,
  "businessId"   text not null unique references public.businesses(id) on delete cascade,
  "mpUserId"     text,
  "accessToken"  text,
  "refreshToken" text,
  "publicKey"    text,
  "expiresAt"    timestamptz,
  nickname       text default '',
  connected      boolean default false,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);
create index if not exists mp_connections_business_idx on public.mp_connections("businessId");

-- IMPORTANTE: Supabase otorga por default grants de tabla completos a anon/authenticated
-- en tablas nuevas. Los revocamos para que el token NO sea legible por el frontend.
revoke all on public.mp_connections from anon;
revoke all on public.mp_connections from authenticated;

-- El frontend solo puede LEER columnas no sensibles (nunca los tokens).
-- Sin insert/update/delete: solo la Edge Function (service_role, saltea RLS) escribe.
grant select ("id", "businessId", "mpUserId", nickname, connected, "createdAt", "updatedAt")
  on public.mp_connections to authenticated;

alter table public.mp_connections enable row level security;
drop policy if exists mp_connections_select on public.mp_connections;
create policy mp_connections_select on public.mp_connections
  for select using ("businessId" = public.auth_business_id());
