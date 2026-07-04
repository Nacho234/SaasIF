# Integración Landing → SaaS (registro + pago Mercado Pago)

Conecta la landing (`if-pos-landing`) con el SaaS (`Mostrador`) para que, cuando un
cliente se registra y paga un plan en la landing, se cree su negocio real en el SaaS
y quede aprovisionado. Ambos apuntan al **mismo proyecto Supabase** (fuente de verdad).

## Flujo end-to-end

1. **Landing** — el cliente completa `CreateBusinessForm` (nombre, email, contraseña,
   negocio, rubro, **plan**) y envía.
2. **Alta real** — la landing hace `supabase.auth.signUp(...)` con metadata
   (`business_name`, `owner_name`, `category`, `plan_code`).
3. **Trigger `handle_new_user()`** (SaaS) — crea `businesses` + `business_settings` +
   `profiles` (rol admin) + `subscriptions` en **`trial` (14 días)** con el plan elegido.
   La cuenta ya es usable.
4. **Checkout** — la landing llama a la Edge Function `create-checkout`, que crea una
   *preference* de Mercado Pago para el plan y devuelve `init_point`. La landing redirige.
5. **Pago** — el cliente paga en Mercado Pago.
6. **Webhook `mp-webhook`** — MP notifica; la función re-consulta el pago a la API de MP
   y, si está `approved`, llama a `activate_subscription()` → suscripción a **`active`**
   con `currentPeriodEnd = +1 mes`, y cierra el registro en `subscription_payments`.

> Plan **enterprise** (precio a medida): se crea la cuenta en trial pero **no** genera
> checkout (queda para contacto comercial).

## Piezas

### SaaS (`~/SaasIF`)
- `supabase/sql/10_billing_plans.sql` — seed de planes (`starter/pro/business/enterprise`,
  precios en ARS), `handle_new_user()` con plan elegido, tabla `subscription_payments`,
  función `activate_subscription()`.
- `supabase/functions/create-checkout/` — crea la preference de MP (requiere JWT).
- `supabase/functions/mp-webhook/` — procesa el pago y activa la suscripción (sin JWT).
- `supabase/config.toml` — `verify_jwt` por función.

### Landing (`~/if-pos-landing`)
- `src/lib/supabase.ts` — cliente Supabase (mismo proyecto).
- `src/lib/checkout.ts` — `registerAndCheckout()`: signUp real + create-checkout.
- `src/components/forms/CreateBusinessForm.tsx` — campo de contraseña + flujo real, con
  **fallback a modo demo** si no hay variables de entorno.

## Puesta en marcha

### 1. Base de datos (Supabase → SQL Editor)
Correr, en orden, los archivos de `supabase/sql/` que falten y luego:
```
supabase/sql/10_billing_plans.sql
```

### 2. Edge Functions
```bash
supabase link --project-ref <TU_PROJECT_REF>
supabase functions deploy create-checkout
supabase functions deploy mp-webhook
supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxxx
supabase secrets set APP_URL=https://app.ifpos.app
supabase secrets set ALLOWED_ORIGIN=https://ifpos.app
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta la plataforma.

### 3. Webhook en Mercado Pago
En el panel de MP (o al crear la preference, ya va `notification_url`), apuntar a:
```
https://<TU_PROJECT_REF>.functions.supabase.co/mp-webhook
```

### 4. Variables de la landing (`.env.local`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_URL=https://app.ifpos.app
```

### 5. Auth de Supabase
- Para alta instantánea sin fricción: **desactivar "Confirm email"** (Authentication →
  Providers → Email). Si se deja activo, la landing muestra "confirmá tu email" y el
  checkout se pospone hasta la verificación.

## Notas
- **Idempotencia**: `mp-webhook` no reactiva si el `providerPaymentId` ya figura `approved`.
- **Renovación**: `activate_subscription()` extiende desde el vencimiento vigente (no pierde días).
- **Precios**: el catálogo canónico de planes está en la tabla `plans` (SaaS). La landing
  muestra su copia en `src/data/plans.ts`; mantener ambos en sync (mismos `code` y precios).
- **Gate de acceso**: el candado de la suscripción va en el login del SaaS (ver HANDOFF),
  validando que exista una suscripción `trial`/`active` no vencida.
