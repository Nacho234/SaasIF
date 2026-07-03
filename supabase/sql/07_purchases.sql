-- =====================================================================
-- Compras y proveedores: tablas suppliers + purchases (RLS) + RPC receive_purchase.
-- =====================================================================

create table if not exists public.suppliers (
  id            text primary key default gen_random_uuid()::text,
  "businessId"  text not null references public.businesses(id) on delete cascade,
  name          text not null,
  phone         text default '',
  email         text default '',
  cuit          text default '',
  address       text default '',
  "contactName" text default '',
  notes         text default '',
  "isActive"    boolean default true,
  "createdAt"   timestamptz not null default now()
);
create index if not exists suppliers_business_idx on public.suppliers("businessId");

create table if not exists public.purchases (
  id             text primary key default gen_random_uuid()::text,
  "businessId"   text not null references public.businesses(id) on delete cascade,
  number         text default '',
  "supplierId"   text,
  "supplierName" text default '',
  date           timestamptz not null default now(),
  items          jsonb default '[]',
  subtotal       numeric(14,2) default 0,
  total          numeric(14,2) default 0,
  status         text not null default 'draft',
  notes          text default '',
  "createdById"  text default '',
  "createdByName" text default '',
  "receivedAt"   timestamptz,
  "createdAt"    timestamptz not null default now()
);
create index if not exists purchases_business_idx on public.purchases("businessId");

grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.purchases to authenticated;

do $$
declare t text;
begin
  foreach t in array array['suppliers','purchases']
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

-- RPC: recibir compra → suma stock y actualiza costo de cada producto, marca recibida. Atómico.
create or replace function public.receive_purchase(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_biz text := public.auth_business_id();
  v_upd jsonb;
begin
  if v_biz is null then raise exception 'No autenticado'; end if;

  for v_upd in select * from jsonb_array_elements(coalesce(payload->'stockUpdates', '[]'::jsonb)) loop
    update public.products
      set stock = stock + (v_upd->>'quantity')::int,
          "costPrice" = coalesce((v_upd->>'unitCost')::numeric, "costPrice")
      where id = v_upd->>'productId' and "businessId" = v_biz;
  end loop;

  update public.purchases set status = 'received', "receivedAt" = now()
    where id = payload->>'purchaseId' and "businessId" = v_biz;

  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.receive_purchase(jsonb) to authenticated;
