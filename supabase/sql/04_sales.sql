-- =====================================================================
-- Ventas: tablas sales + sale_items (RLS) + RPC transaccional create_sale.
-- =====================================================================

create table if not exists public.sales (
  id               text primary key default gen_random_uuid()::text,
  "businessId"     text not null references public.businesses(id) on delete cascade,
  "saleNumber"     text not null default '',
  date             timestamptz not null default now(),
  "customerId"     text,
  "customerName"   text,
  "sellerId"       text default '',
  "sellerName"     text default '',
  "cashRegisterId" text,
  subtotal         numeric(14,2) default 0,
  "discountTotal"  numeric(14,2) default 0,
  "surchargeTotal" numeric(14,2) default 0,
  total            numeric(14,2) default 0,
  payments         jsonb default '[]',
  "cashReceived"   numeric(14,2),
  change           numeric(14,2) default 0,
  status           text not null default 'completed',
  notes            text default '',
  "promotionId"    text,
  "createdAt"      timestamptz not null default now(),
  "cancelledAt"    timestamptz,
  "cancelReason"   text default ''
);
create index if not exists sales_business_idx on public.sales("businessId");
create index if not exists sales_business_date_idx on public.sales("businessId", date desc);

create table if not exists public.sale_items (
  id                text primary key default gen_random_uuid()::text,
  "businessId"      text not null references public.businesses(id) on delete cascade,
  "saleId"          text not null references public.sales(id) on delete cascade,
  "productId"       text,
  "productName"     text default '',
  sku               text default '',
  quantity          numeric(14,2) default 0,
  "unitPrice"       numeric(14,2) default 0,
  "costPrice"       numeric(14,2) default 0,
  discount          numeric(14,2) default 0,
  subtotal          numeric(14,2) default 0,
  "isCombo"         boolean default false,
  "comboId"         text,
  "comboComponents" jsonb,
  "returnedQuantity" numeric(14,2) default 0
);
create index if not exists sale_items_business_idx on public.sale_items("businessId");
create index if not exists sale_items_sale_idx on public.sale_items("saleId");

grant select, insert, update, delete on public.sales to authenticated;
grant select, insert, update, delete on public.sale_items to authenticated;

do $$
declare t text;
begin
  foreach t in array array['sales','sale_items']
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

-- RPC transaccional: crea la venta + ítems + descuenta stock + movimientos de caja + deuda.
-- SECURITY DEFINER: corre como owner pero SCOPEA todo al businessId del usuario (auth_business_id()),
-- así el cliente no puede inyectar otro negocio.
create or replace function public.create_sale(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_biz     text := public.auth_business_id();
  v_sale_id text := coalesce(payload->>'id', gen_random_uuid()::text);
  v_item    jsonb;
  v_delta   jsonb;
  v_pay     jsonb;
begin
  if v_biz is null then raise exception 'No autenticado'; end if;

  insert into public.sales (id, "businessId", "saleNumber", date, "customerId", "customerName",
    "sellerId", "sellerName", "cashRegisterId", subtotal, "discountTotal", "surchargeTotal", total,
    payments, "cashReceived", change, status, notes, "promotionId", "createdAt")
  values (v_sale_id, v_biz, payload->>'saleNumber', coalesce((payload->>'date')::timestamptz, now()),
    payload->>'customerId', payload->>'customerName', payload->>'sellerId', payload->>'sellerName',
    payload->>'cashRegisterId', (payload->>'subtotal')::numeric, (payload->>'discountTotal')::numeric,
    (payload->>'surchargeTotal')::numeric, (payload->>'total')::numeric,
    coalesce(payload->'payments', '[]'::jsonb), nullif(payload->>'cashReceived','')::numeric,
    coalesce((payload->>'change')::numeric, 0), 'completed', coalesce(payload->>'notes',''),
    payload->>'promotionId', now());

  -- ítems
  for v_item in select * from jsonb_array_elements(coalesce(payload->'items', '[]'::jsonb)) loop
    insert into public.sale_items (id, "businessId", "saleId", "productId", "productName", sku,
      quantity, "unitPrice", "costPrice", discount, subtotal, "isCombo", "comboId", "comboComponents", "returnedQuantity")
    values (coalesce(v_item->>'id', gen_random_uuid()::text), v_biz, v_sale_id, v_item->>'productId',
      v_item->>'productName', v_item->>'sku', (v_item->>'quantity')::numeric, (v_item->>'unitPrice')::numeric,
      (v_item->>'costPrice')::numeric, coalesce((v_item->>'discount')::numeric,0), (v_item->>'subtotal')::numeric,
      coalesce((v_item->>'isCombo')::boolean,false), v_item->>'comboId', v_item->'comboComponents', 0);
  end loop;

  -- descuento de stock (deltas consolidados que manda el cliente; combos ya expandidos)
  for v_delta in select * from jsonb_array_elements(coalesce(payload->'stockDeltas', '[]'::jsonb)) loop
    update public.products set stock = stock - (v_delta->>'qty')::int
      where id = v_delta->>'productId' and "businessId" = v_biz;
  end loop;

  -- movimientos de caja (ya calculados por el cliente: netos de vuelto, sin cuenta corriente)
  for v_pay in select * from jsonb_array_elements(coalesce(payload->'cashMovements', '[]'::jsonb)) loop
    insert into public.cash_movements (id, "businessId", "cashRegisterId", type, direction, amount,
      method, reason, "userId", "userName", "relatedSaleId", date)
    values (coalesce(v_pay->>'id', gen_random_uuid()::text), v_biz,
      coalesce(v_pay->>'cashRegisterId', payload->>'cashRegisterId'), 'sale', 'in',
      (v_pay->>'amount')::numeric, v_pay->>'method', 'Venta ' || (payload->>'saleNumber'),
      coalesce(payload->>'sellerId',''), coalesce(payload->>'sellerName',''), v_sale_id, now());
  end loop;

  -- cuenta corriente: suma la deuda al cliente
  if coalesce((payload->>'customerDebtDelta')::numeric, 0) <> 0 and payload->>'customerId' is not null then
    update public.customers set "debtBalance" = "debtBalance" + (payload->>'customerDebtDelta')::numeric
      where id = payload->>'customerId' and "businessId" = v_biz;
  end if;

  return jsonb_build_object('id', v_sale_id, 'saleNumber', payload->>'saleNumber');
end $$;

grant execute on function public.create_sale(jsonb) to authenticated;
