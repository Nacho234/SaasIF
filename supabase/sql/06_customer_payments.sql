-- =====================================================================
-- Cuenta corriente: pagos de deuda. Tabla customer_payments (RLS) + RPC atómica.
-- =====================================================================

create table if not exists public.customer_payments (
  id           text primary key default gen_random_uuid()::text,
  "businessId" text not null references public.businesses(id) on delete cascade,
  "customerId" text not null references public.customers(id) on delete cascade,
  amount       numeric(14,2) default 0,
  method       text default 'cash',
  date         timestamptz not null default now(),
  "userId"     text default '',
  "userName"   text default '',
  notes        text default ''
);
create index if not exists customer_payments_business_idx on public.customer_payments("businessId");
create index if not exists customer_payments_customer_idx on public.customer_payments("customerId");

grant select, insert, update, delete on public.customer_payments to authenticated;

alter table public.customer_payments enable row level security;
drop policy if exists customer_payments_select on public.customer_payments;
drop policy if exists customer_payments_insert on public.customer_payments;
drop policy if exists customer_payments_update on public.customer_payments;
drop policy if exists customer_payments_delete on public.customer_payments;
create policy customer_payments_select on public.customer_payments for select using ("businessId" = public.auth_business_id());
create policy customer_payments_insert on public.customer_payments for insert with check ("businessId" = public.auth_business_id());
create policy customer_payments_update on public.customer_payments for update using ("businessId" = public.auth_business_id()) with check ("businessId" = public.auth_business_id());
create policy customer_payments_delete on public.customer_payments for delete using ("businessId" = public.auth_business_id());

-- RPC: baja la deuda del cliente + registra el pago + movimiento de caja, atómico.
create or replace function public.register_debt_payment(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_biz text := public.auth_business_id();
  v_id  text := coalesce(payload->>'id', gen_random_uuid()::text);
  v_cm  jsonb := payload->'cashMovement';
begin
  if v_biz is null then raise exception 'No autenticado'; end if;

  update public.customers set "debtBalance" = "debtBalance" - (payload->>'amount')::numeric
    where id = payload->>'customerId' and "businessId" = v_biz;

  insert into public.customer_payments (id, "businessId", "customerId", amount, method, date, "userId", "userName", notes)
  values (v_id, v_biz, payload->>'customerId', (payload->>'amount')::numeric,
    coalesce(payload->>'method','cash'), now(), coalesce(payload->>'userId',''),
    coalesce(payload->>'userName',''), coalesce(payload->>'notes',''));

  if v_cm is not null and v_cm <> 'null'::jsonb then
    insert into public.cash_movements (id, "businessId", "cashRegisterId", type, direction, amount,
      method, reason, "userId", "userName", "relatedSaleId", date)
    values (gen_random_uuid()::text, v_biz, v_cm->>'cashRegisterId', 'debt_payment', 'in',
      (v_cm->>'amount')::numeric, v_cm->>'method', coalesce(v_cm->>'reason','Pago de deuda'),
      coalesce(payload->>'userId',''), coalesce(payload->>'userName',''), null, now());
  end if;

  return jsonb_build_object('id', v_id);
end $$;

grant execute on function public.register_debt_payment(jsonb) to authenticated;
