-- =====================================================================
-- Supabase-native: multi-tenant + Auth + RLS  (Fase 1)
-- Correr en Supabase → SQL Editor. Idempotente (se puede correr de nuevo).
-- =====================================================================

-- 1) profiles: linkea el usuario de Supabase Auth con su negocio + rol.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  "businessId" text not null references public.businesses(id) on delete cascade,
  name        text not null default '',
  role        text not null default 'admin',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists profiles_business_idx on public.profiles("businessId");

-- 2) Helper: businessId del usuario logueado (SECURITY DEFINER → puede leer profiles sin chocar con RLS).
create or replace function public.auth_business_id()
returns text language sql stable security definer set search_path = public as $$
  select "businessId" from public.profiles where id = auth.uid()
$$;

-- 3) Al registrarse un usuario, crear negocio + settings + profile + suscripción trial.
--    Lee la metadata que manda el frontend en signUp({ options: { data: {...} } }).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_business_id text := gen_random_uuid()::text;
  v_plan_id     text;
begin
  insert into public.businesses (id, name, category, "createdAt", "updatedAt")
    values (v_business_id,
            coalesce(nullif(new.raw_user_meta_data->>'business_name', ''), 'Mi negocio'),
            coalesce(new.raw_user_meta_data->>'category', ''), now(), now());

  insert into public.business_settings (id, "businessId", "createdAt", "updatedAt")
    values (gen_random_uuid()::text, v_business_id, now(), now());

  insert into public.profiles (id, "businessId", name, role)
    values (new.id, v_business_id,
            coalesce(new.raw_user_meta_data->>'owner_name', ''), 'admin');

  select id into v_plan_id from public.plans where code = 'basico' limit 1;
  if v_plan_id is not null then
    insert into public.subscriptions (id, "businessId", "planId", status, "trialEndsAt", "createdAt", "updatedAt")
      values (gen_random_uuid()::text, v_business_id, v_plan_id, 'trial', now() + interval '14 days', now(), now());
  end if;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Grants: el rol `authenticated` necesita permiso de tabla (RLS filtra las filas).
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.auth_business_id() to authenticated, anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- 5) RLS: cada negocio solo ve/toca lo suyo.
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using ("businessId" = public.auth_business_id());

alter table public.businesses enable row level security;
drop policy if exists businesses_select on public.businesses;
drop policy if exists businesses_update on public.businesses;
drop policy if exists businesses_delete on public.businesses;
create policy businesses_select on public.businesses for select using (id = public.auth_business_id());
create policy businesses_update on public.businesses for update using (id = public.auth_business_id()) with check (id = public.auth_business_id());
create policy businesses_delete on public.businesses for delete using (id = public.auth_business_id());

-- Tablas hijas (todas tienen columna "businessId"): política estándar SELECT/INSERT/UPDATE/DELETE.
do $$
declare t text;
begin
  foreach t in array array[
    'business_settings','branches','subscriptions',
    'categories','brands','products','customers',
    'cash_registers','cash_movements'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select using ("businessId" = public.auth_business_id())', t || '_select', t);
    execute format('create policy %I on public.%I for insert with check ("businessId" = public.auth_business_id())', t || '_insert', t);
    execute format('create policy %I on public.%I for update using ("businessId" = public.auth_business_id()) with check ("businessId" = public.auth_business_id())', t || '_update', t);
    execute format('create policy %I on public.%I for delete using ("businessId" = public.auth_business_id())', t || '_delete', t);
  end loop;
end $$;
