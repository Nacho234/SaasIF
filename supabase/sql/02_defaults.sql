-- =====================================================================
-- Defaults de DB para inserts vía supabase-js (antes los ponía Prisma).
-- id: cuid de Prisma → sin default en la DB. updatedAt: @updatedAt → sin default.
-- Correr en Supabase → SQL Editor. Idempotente.
-- =====================================================================

-- 1) id: default a uuid (texto) para todas las tablas de la app.
do $$
declare t text;
begin
  foreach t in array array[
    'products','categories','brands','customers',
    'cash_registers','cash_movements',
    'businesses','business_settings','branches','subscriptions'
  ]
  loop
    execute format('alter table public.%I alter column id set default gen_random_uuid()::text', t);
  end loop;
end $$;

-- 2) updatedAt: default now() + trigger que lo actualiza en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new."updatedAt" := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'products','categories','brands','customers',
    'cash_registers','businesses','business_settings','subscriptions'
  ]
  loop
    execute format('alter table public.%I alter column "updatedAt" set default now()', t);
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
