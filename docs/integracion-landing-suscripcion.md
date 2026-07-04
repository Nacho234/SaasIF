# Integración Landing ↔ SaaS (suscripción y alta de cuenta)

La **landing** (proyecto aparte, la trabaja Nico) cobra la suscripción y **crea la cuenta**.
El **SaaS** solo hace login y **bloquea el acceso si la suscripción no está activa**.
Este documento es el contrato entre ambos.

> ⚠️ **Seguridad clave:** todo lo que escribe en Supabase desde la landing va en su **backend**
> con la **service_role key** (SECRETA). Nunca en el frontend de la landing ni en el repo.
> El usuario logueado en el SaaS **solo puede LEER** su suscripción (RLS + lockdown); **no puede
> modificarla** (probado: da 403). Por eso la activación la hace la landing con service_role.

## Keys de Supabase (landing)
- `SUPABASE_URL` = `https://epsotvywoklcaqbdvxrv.supabase.co`
- `SERVICE_ROLE_KEY` = la **secret key** del proyecto (Supabase → Project Settings → API). **Solo backend.**

## 1. Crear la cuenta (cuando el pago se confirma)
En el backend de la landing, con la service_role key:

```js
import { createClient } from '@supabase/supabase-js';
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,                 // la que eligió el cliente (o una temporal + reset)
  email_confirm: true,      // ya pagó, lo damos por verificado
  user_metadata: { business_name: 'Nombre del local', owner_name: 'Nombre del dueño' },
});
const userId = data.user.id;
```

El trigger `handle_new_user` crea automáticamente: **negocio + settings + perfil (rol admin) + suscripción (status `trial`)**.
No hay que insertar esas filas a mano.

## 2. Activar la suscripción (mismo momento del pago)
Marca la suscripción como paga. Por SQL (o supabase-js con service_role):

```sql
update public.subscriptions
set status = 'active',
    "currentPeriodEnd" = now() + interval '1 month'   -- fin del período pago
where "businessId" = (select "businessId" from public.profiles where id = '<userId>');
```

## 3. Renovar / cortar (webhook de Mercado Pago)
- **Pago recurrente OK** → `status='active'`, `currentPeriodEnd = <próximo vencimiento>`.
- **Impago / baja** → `status` a `'past_due'`, `'cancelled'` o `'expired'` (o dejar vencer `currentPeriodEnd`).

## 4. Qué hace el SaaS con esto (ya está implementado)
Al iniciar sesión lee `subscriptions` del negocio y **deja pasar** si:
- `status='active'` y `currentPeriodEnd` es futuro (o null), **o**
- `status='trial'` y `trialEndsAt` es futuro (o null).

**Bloquea** (pantalla "suscripción vencida") si el status es `past_due/cancelled/expired/blocked`
o el período venció. Si no hay fila de suscripción, no bloquea (fail-open, para no dejar a nadie afuera por un bug).

## Resumen del flujo
1. Cliente paga en la **landing** → landing crea el usuario (service_role) + pone `status='active'`.
2. Cliente entra al **SaaS** con ese email/contraseña → login → ve su negocio.
3. Si deja de pagar → webhook pone `status` no-activo → el SaaS lo bloquea en el próximo ingreso.
