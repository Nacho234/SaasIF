-- =====================================================================
-- Devoluciones: tabla sale_returns (RLS) + RPC transaccional create_return.
-- =====================================================================

create table if not exists public.sale_returns (
  id             text primary key default gen_random_uuid()::text,
  "businessId"   text not null references public.businesses(id) on delete cascade,
  "saleId"       text not null references public.sales(id) on delete cascade,
  "saleNumber"   text default '',
  items          jsonb default '[]',
  reason         text default '',
  "refundMethod" text default 'none',
  "refundAmount" numeric(14,2) default 0,
  "userId"       text default '',
  "userName"     text default '',
  date           timestamptz not null default now(),
  notes          text default ''
);
create index if not exists sale_returns_business_idx on public.sale_returns("businessId");
create index if not exists sale_returns_sale_idx on public.sale_returns("saleId");

grant select, insert, update, delete on public.sale_returns to authenticated;

alter table public.sale_returns enable row level security;
drop policy if exists sale_returns_select on public.sale_returns;
drop policy if exists sale_returns_insert on public.sale_returns;
drop policy if exists sale_returns_update on public.sale_returns;
drop policy if exists sale_returns_delete on public.sale_returns;
create policy sale_returns_select on public.sale_returns for select using ("businessId" = public.auth_business_id());
create policy sale_returns_insert on public.sale_returns for insert with check ("businessId" = public.auth_business_id());
create policy sale_returns_update on public.sale_returns for update using ("businessId" = public.auth_business_id()) with check ("businessId" = public.auth_business_id());
create policy sale_returns_delete on public.sale_returns for delete using ("businessId" = public.auth_business_id());

-- RPC: crea la devolución + actualiza la venta original + restock + reembolso/crédito, atómico.
create or replace function public.create_return(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_biz    text := public.auth_business_id();
  v_ret_id text := coalesce(payload->>'id', gen_random_uuid()::text);
  v_upd    jsonb;
  v_delta  jsonb;
  v_cm     jsonb := payload->'cashMovement';
begin
  if v_biz is null then raise exception 'No autenticado'; end if;

  insert into public.sale_returns (id, "businessId", "saleId", "saleNumber", items, reason,
    "refundMethod", "refundAmount", "userId", "userName", date, notes)
  values (v_ret_id, v_biz, payload->>'saleId', payload->>'saleNumber',
    coalesce(payload->'items', '[]'::jsonb), payload->>'reason', payload->>'refundMethod',
    coalesce((payload->>'refundAmount')::numeric, 0), coalesce(payload->>'userId',''),
    coalesce(payload->>'userName',''), now(), coalesce(payload->>'notes',''));

  -- actualizar returnedQuantity de los ítems de la venta original
  for v_upd in select * from jsonb_array_elements(coalesce(payload->'itemReturnUpdates', '[]'::jsonb)) loop
    update public.sale_items set "returnedQuantity" = (v_upd->>'returnedQuantity')::numeric
      where id = v_upd->>'saleItemId' and "businessId" = v_biz;
  end loop;

  -- estado de la venta (returned / partially_returned)
  if payload->>'saleStatus' is not null then
    update public.sales set status = payload->>'saleStatus'
      where id = payload->>'saleId' and "businessId" = v_biz;
  end if;

  -- restock (deltas consolidados; combos ya expandidos; solo ítems con restock=true)
  for v_delta in select * from jsonb_array_elements(coalesce(payload->'restockDeltas', '[]'::jsonb)) loop
    update public.products set stock = stock + (v_delta->>'qty')::int
      where id = v_delta->>'productId' and "businessId" = v_biz;
  end loop;

  -- reembolso en efectivo/transferencia → salida de caja
  if v_cm is not null and v_cm <> 'null'::jsonb then
    insert into public.cash_movements (id, "businessId", "cashRegisterId", type, direction, amount,
      method, reason, "userId", "userName", "relatedSaleId", date)
    values (gen_random_uuid()::text, v_biz, v_cm->>'cashRegisterId', 'refund', 'out',
      (v_cm->>'amount')::numeric, v_cm->>'method', 'Devolución venta ' || (payload->>'saleNumber'),
      coalesce(payload->>'userId',''), coalesce(payload->>'userName',''), payload->>'saleId', now());
  end if;

  -- crédito a favor del cliente (customerCreditDelta negativo reduce la deuda)
  if coalesce((payload->>'customerCreditDelta')::numeric, 0) <> 0 and payload->>'customerId' is not null then
    update public.customers set "debtBalance" = "debtBalance" + (payload->>'customerCreditDelta')::numeric
      where id = payload->>'customerId' and "businessId" = v_biz;
  end if;

  return jsonb_build_object('id', v_ret_id);
end $$;

grant execute on function public.create_return(jsonb) to authenticated;
