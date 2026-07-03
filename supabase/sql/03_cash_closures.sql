-- =====================================================================
-- Caja: tablas de cierres (snapshot) y cierres de terminal. Con RLS por businessId.
-- =====================================================================

create table if not exists public.cash_closures (
  id                      text primary key default gen_random_uuid()::text,
  "businessId"            text not null references public.businesses(id) on delete cascade,
  "cashRegisterId"        text not null references public.cash_registers(id) on delete cascade,
  "registerNumber"        text not null default '',
  version                 int not null default 1,
  "openedAt"              timestamptz,
  "closedAt"              timestamptz,
  "openedByName"          text default '',
  "closedByName"          text default '',
  "openingAmount"         numeric(14,2) default 0,
  "expectedCash"          numeric(14,2) default 0,
  "countedCash"           numeric(14,2) default 0,
  "cashDifference"        numeric(14,2) default 0,
  "salesCount"            int default 0,
  "salesTotal"            numeric(14,2) default 0,
  "salesByMethod"         jsonb default '{}',
  "manualIncome"          numeric(14,2) default 0,
  "expensesTotal"         numeric(14,2) default 0,
  withdrawals             numeric(14,2) default 0,
  refunds                 numeric(14,2) default 0,
  cancellations           numeric(14,2) default 0,
  "debtPayments"          numeric(14,2) default 0,
  "internalTicketsTotal"  numeric(14,2) default 0,
  "fiscalInvoicesTotal"   numeric(14,2) default 0,
  "paymentVerifications"  jsonb default '[]',
  "terminalClosures"      jsonb default '[]',
  "unitsSold"             int default 0,
  "productsSoldCount"     int default 0,
  "inventoryMovementsCount" int default 0,
  "employeeSignature"     text,
  "managerSignature"      text,
  notes                   text default '',
  status                  text not null default 'closed',
  "createdAt"             timestamptz not null default now()
);
create index if not exists cash_closures_business_idx on public.cash_closures("businessId");
create index if not exists cash_closures_register_idx on public.cash_closures("cashRegisterId");

create table if not exists public.terminal_closures (
  id                text primary key default gen_random_uuid()::text,
  "businessId"      text not null references public.businesses(id) on delete cascade,
  "cashRegisterId"  text not null references public.cash_registers(id) on delete cascade,
  processor         text not null default 'other',
  "terminalLabel"   text default '',
  "batchNumber"     text default '',
  "closingNumber"   text default '',
  "systemDebit"     numeric(14,2) default 0,
  "terminalDebit"   numeric(14,2) default 0,
  "debitDifference" numeric(14,2) default 0,
  "systemCredit"    numeric(14,2) default 0,
  "terminalCredit"  numeric(14,2) default 0,
  "creditDifference" numeric(14,2) default 0,
  "systemQr"        numeric(14,2) default 0,
  "terminalQr"      numeric(14,2) default 0,
  "qrDifference"    numeric(14,2) default 0,
  "totalSystem"     numeric(14,2) default 0,
  "totalTerminal"   numeric(14,2) default 0,
  "totalDifference" numeric(14,2) default 0,
  notes             text default '',
  "createdById"     text default '',
  "createdByName"   text default '',
  date              timestamptz not null default now()
);
create index if not exists terminal_closures_business_idx on public.terminal_closures("businessId");
create index if not exists terminal_closures_register_idx on public.terminal_closures("cashRegisterId");

grant select, insert, update, delete on public.cash_closures to authenticated;
grant select, insert, update, delete on public.terminal_closures to authenticated;

do $$
declare t text;
begin
  foreach t in array array['cash_closures','terminal_closures']
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
