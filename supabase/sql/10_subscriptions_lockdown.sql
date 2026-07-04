-- =====================================================================
-- SEGURIDAD: la suscripción es de SOLO LECTURA para el negocio.
-- Sin esto, un usuario logueado podría auto-activarse la suscripción vía API
-- y saltear el candado. Solo la landing (service_role, que saltea RLS) la escribe.
-- El trigger handle_new_user (SECURITY DEFINER) sigue pudiendo crear la fila trial.
-- =====================================================================

revoke insert, update, delete on public.subscriptions from authenticated;

drop policy if exists subscriptions_insert on public.subscriptions;
drop policy if exists subscriptions_update on public.subscriptions;
drop policy if exists subscriptions_delete on public.subscriptions;
-- Queda solo subscriptions_select (businessId = auth_business_id()): el negocio LEE su suscripción, no la modifica.
