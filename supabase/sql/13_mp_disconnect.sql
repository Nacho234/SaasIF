-- =====================================================================
-- Datos visibles de la conexión MP (email) + desvincular.
-- =====================================================================

alter table public.mp_connections add column if not exists email text default '';
grant select (email) on public.mp_connections to authenticated;

-- Desvincular: borra la conexión (y el token) del negocio del usuario.
-- SECURITY DEFINER para poder borrar pese a que authenticated no tiene delete;
-- scopeada a auth_business_id() para que solo borre lo suyo.
create or replace function public.mp_disconnect()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.mp_connections where "businessId" = public.auth_business_id();
end $$;

grant execute on function public.mp_disconnect() to authenticated;
