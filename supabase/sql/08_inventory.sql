-- =====================================================================
-- Kardex: inventory_movements (historial de stock). RLS por businessId.
-- El stock (products.stock) lo cambian las RPC create_sale/create_return/
-- receive_purchase y el ajuste manual; acá se registra el movimiento (log).
-- =====================================================================

create table if not exists public.inventory_movements (
  id                  text primary key default gen_random_uuid()::text,
  "businessId"        text not null references public.businesses(id) on delete cascade,
  "productId"         text,
  "productName"       text default '',
  type                text not null,
  quantity            numeric(14,2) default 0,
  "previousStock"     numeric(14,2) default 0,
  "newStock"          numeric(14,2) default 0,
  reason              text default '',
  "userId"            text default '',
  "userName"          text default '',
  "relatedSaleId"     text,
  "relatedPurchaseId" text,
  date                timestamptz not null default now(),
  notes               text default ''
);
create index if not exists inventory_movements_business_idx on public.inventory_movements("businessId");
create index if not exists inventory_movements_product_idx on public.inventory_movements("productId");

grant select, insert, update, delete on public.inventory_movements to authenticated;

alter table public.inventory_movements enable row level security;
drop policy if exists inventory_movements_select on public.inventory_movements;
drop policy if exists inventory_movements_insert on public.inventory_movements;
create policy inventory_movements_select on public.inventory_movements for select using ("businessId" = public.auth_business_id());
create policy inventory_movements_insert on public.inventory_movements for insert with check ("businessId" = public.auth_business_id());
