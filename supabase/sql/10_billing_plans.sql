-- =====================================================================
-- Billing: catálogo de planes + alta con plan elegido + pagos (Mercado Pago).
-- Fuente de verdad del catálogo. Los `code` coinciden 1:1 con la landing
-- (if-pos-landing → src/data/plans.ts): starter / pro / business / enterprise.
-- Correr en Supabase → SQL Editor. Idempotente (se puede correr de nuevo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Seed del catálogo de planes (upsert por `code`, ya tiene unique index).
--    priceMonthly en ARS (pesos enteros). enterprise = 0 → es "a medida":
--    la landing lo trata como contacto, no genera checkout.
-- ---------------------------------------------------------------------
insert into public.plans (id, code, name, "priceMonthly", "maxUsers", "maxBranches", features, "isActive")
values
  (gen_random_uuid()::text, 'starter',    'Starter',    29000,  1,  1,
    '["POS básico","Caja diaria","Clientes","Stock básico","Reportes básicos","Soporte básico"]'::jsonb, true),
  (gen_random_uuid()::text, 'pro',        'Pro',        59000,  3,  1,
    '["POS completo","Caja completa","Stock avanzado","Clientes y cuenta corriente","Reportes","Gastos y promociones","Soporte prioritario"]'::jsonb, true),
  (gen_random_uuid()::text, 'business',   'Business',   99000, 10,  3,
    '["POS completo","Caja avanzada","Stock avanzado","Reportes avanzados","Usuarios y permisos","Proveedores y compras","Auditoría","Multi-sucursal preparado","Soporte prioritario"]'::jsonb, true),
  (gen_random_uuid()::text, 'enterprise', 'Enterprise',     0, 999, 999,
    '["Usuarios personalizados","Sucursales personalizadas","Integraciones futuras","Soporte premium","Onboarding avanzado","Seguridad avanzada"]'::jsonb, true)
on conflict (code) do update set
  name           = excluded.name,
  "priceMonthly" = excluded."priceMonthly",
  "maxUsers"     = excluded."maxUsers",
  "maxBranches"  = excluded."maxBranches",
  features       = excluded.features,
  "isActive"     = excluded."isActive";

-- ---------------------------------------------------------------------
-- 2) Alta de usuario: crear negocio + settings + profile + suscripción trial
--    con el PLAN ELEGIDO en la landing. Reemplaza al handle_new_user de
--    01_auth_rls.sql (que siempre usaba 'basico'). Lee metadata del signUp:
--      business_name, owner_name, category, plan_code.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_business_id text := gen_random_uuid()::text;
  v_plan_code   text := coalesce(nullif(new.raw_user_meta_data->>'plan_code', ''), 'starter');
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

  -- Plan elegido; si no existe, cae a 'starter'; si tampoco, al primer plan activo.
  select id into v_plan_id from public.plans where code = v_plan_code and "isActive" limit 1;
  if v_plan_id is null then
    select id into v_plan_id from public.plans where code = 'starter' limit 1;
  end if;
  if v_plan_id is null then
    select id into v_plan_id from public.plans where "isActive" order by "priceMonthly" limit 1;
  end if;

  if v_plan_id is not null then
    -- Arranca en trial: la cuenta es usable ya. El pago (webhook MP) la pasa a 'active'.
    insert into public.subscriptions (id, "businessId", "planId", status, "trialEndsAt", "createdAt", "updatedAt")
      values (gen_random_uuid()::text, v_business_id, v_plan_id, 'trial', now() + interval '14 days', now(), now());
  end if;

  return new;
end; $$;

-- ---------------------------------------------------------------------
-- 3) Tabla de pagos de suscripción (Mercado Pago). Nombre distinto del
--    `payments` de ventas. El webhook (service_role) la escribe; el negocio
--    puede leer los suyos.
-- ---------------------------------------------------------------------
create table if not exists public.subscription_payments (
  id                  text primary key default gen_random_uuid()::text,
  "businessId"        text not null references public.businesses(id) on delete cascade,
  "planCode"          text not null,
  provider            text not null default 'mercadopago',
  "preferenceId"      text,                 -- id de la preference de checkout
  "providerPaymentId" text,                 -- id del pago en MP (cuando confirma)
  amount              integer not null default 0,   -- ARS enteros
  currency            text not null default 'ARS',
  status              text not null default 'pending', -- pending | approved | rejected | cancelled
  raw                 jsonb,                -- payload crudo de MP (auditoría)
  "createdAt"         timestamptz not null default now(),
  "updatedAt"         timestamptz not null default now()
);
create index if not exists subscription_payments_business_idx on public.subscription_payments("businessId");
create index if not exists subscription_payments_pref_idx     on public.subscription_payments("preferenceId");

drop trigger if exists set_updated_at on public.subscription_payments;
create trigger set_updated_at before update on public.subscription_payments
  for each row execute function public.set_updated_at();

alter table public.subscription_payments enable row level security;
-- El negocio ve sus propios pagos (lectura). Los writes los hace el webhook con service_role,
-- que ignora RLS, así que no hace falta policy de insert/update para authenticated.
drop policy if exists subscription_payments_select on public.subscription_payments;
create policy subscription_payments_select on public.subscription_payments for select
  using ("businessId" = public.auth_business_id());

grant select on public.subscription_payments to authenticated;

-- ---------------------------------------------------------------------
-- 4) Activar/renovar suscripción tras un pago aprobado. SECURITY DEFINER
--    para que el webhook (service_role) la llame de forma atómica.
--    Extiende currentPeriodEnd 1 mes desde hoy (o desde el vencimiento vigente
--    si todavía no venció → no se pierden días al renovar).
-- ---------------------------------------------------------------------
create or replace function public.activate_subscription(p_business_id text, p_plan_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_plan_id text;
  v_base    timestamptz;
begin
  select id into v_plan_id from public.plans where code = p_plan_code limit 1;
  if v_plan_id is null then
    raise exception 'Plan % inexistente', p_plan_code;
  end if;

  select greatest(coalesce("currentPeriodEnd", now()), now())
    into v_base
    from public.subscriptions
   where "businessId" = p_business_id
   order by "createdAt" desc
   limit 1;

  if v_base is null then
    -- No había suscripción (caso borde): crearla.
    insert into public.subscriptions (id, "businessId", "planId", status, "currentPeriodEnd", "createdAt", "updatedAt")
      values (gen_random_uuid()::text, p_business_id, v_plan_id, 'active', now() + interval '1 month', now(), now());
  else
    update public.subscriptions
       set "planId"           = v_plan_id,
           status             = 'active',
           "currentPeriodEnd" = v_base + interval '1 month',
           "updatedAt"        = now()
     where "businessId" = p_business_id;
  end if;
end; $$;

revoke all on function public.activate_subscription(text, text) from public, anon, authenticated;
