# Handoff — Mostrador a producción (PWA + suscripción + Supabase)

> Estado al momento del handoff: **Mostrador** es una PWA demo 100% frontend con datos en
> localStorage (ver `README.md`). Funciona, está en GitHub (`Nacho234/SaaS-model`, rama `main`)
> y sirve como demo comercial. Este documento define **cómo llevarlo a producción**.

## Modelo elegido (decisión tomada)

**PWA instalable + suscripción + base de datos en la nube (Supabase). Sin localStorage como
persistencia real** (localStorage queda solo como "modo demo" para la landing / probar sin cuenta).

- El comerciante entra a una URL (`app.tuproducto.com`), instala la PWA y trabaja siempre contra la nube.
- Una sola base de datos en Supabase es la **fuente de verdad**. El POS del local y el e-commerce
  (cuando exista) leen y escriben la misma base → stock sincronizado en tiempo real, sin sobreventa.
- Descartado: modelo Tango con datos locales + motor de sync (demasiado complejo, sobreventa inevitable).
- Descartado: `.exe` con Electron (la PWA cubre el caso y es más simple de distribuir/actualizar).
- Descartado: versión kiosco solo-localStorage (no se puede cobrar suscripción si nunca llama al servidor).

## Reglas de oro (no romper)

1. **El candado de la suscripción está en el LOGIN, no en la descarga.** La PWA es pública; lo que se
   cobra es el acceso. Al iniciar sesión, el backend valida `subscription_active`.
2. **Fuente de verdad única en la nube.** Nunca dos copias del stock sincronizándose. El descuento de
   stock se hace con transacción atómica en Supabase para evitar vender la última unidad dos veces.
3. **Los componentes nunca tocan la persistencia directo.** Toda la lógica pasa por `src/services/`.
   Esa capa es la costura donde se reemplaza localStorage por Supabase (adaptador de almacenamiento).
4. **Nada de tiers solo-localStorage sin ping de licencia.** Si algún día se ofrece offline-only, igual
   debe validar la licencia online periódicamente.

## Piezas a construir

### 1. Supabase (auth + datos + RLS)
- **Auth**: email/contraseña (Supabase Auth). Cada usuario pertenece a un `business`.
- **Schema**: los tipos de `src/types/` son casi el schema tal cual. Tablas base:
  `businesses`, `users` (perfil + rol + permisos), `products`, `categories`, `brands`, `combos`,
  `customers`, `customer_payments`, `sales`, `sale_items`, `payments`, `returns`,
  `cash_registers`, `cash_movements`, `inventory_movements`, `suppliers`, `purchases`,
  `promotions`, `expenses`, `audit_logs`, `notifications`, `settings`.
- **Multi-tenant**: `business_id` en cada tabla + **Row Level Security** para que cada comercio solo
  vea lo suyo. Este es el corazón del SaaS.
- **Suscripción**: campo `subscription_active` (+ `plan`, `valid_until`) en `businesses`. RLS bloquea
  el acceso a los datos si no está activa.

### 2. Capa de servicios → adaptador Supabase
- Hoy `src/services/*` orquesta los stores de Zustand (localStorage). Objetivo: mismos servicios,
  pero hablando con Supabase. Patrón: un `StorageAdapter` con dos implementaciones
  (`LocalStorageAdapter` para demo, `SupabaseAdapter` para producción).
- La UI y las reglas de negocio (validaciones de venta, caja, devoluciones) **no cambian**.

### 3. Suscripción y cobro
- **Mercado Pago** (o Stripe) con suscripción recurrente.
- **Webhook** → actualiza `subscription_active` en `businesses` cuando pagan / cae el pago.
- Al login, la PWA verifica el flag (con margen de gracia offline de N días vía caché).

### 4. Landing page
- Publicidad + registro + pago → crea el `business` + usuario admin → habilita el acceso a la PWA.
- Botón "Instalar app" / instrucciones de instalación de la PWA.

### 5. E-commerce como módulo activable (para casos tipo Zafari)
- Kiosco sin venta online: mismo código, módulo e-commerce **apagado** por plan.
- Comercio con tienda online: módulo **prendido**, tienda pública leyendo/escribiendo la misma base
  → stock unificado local + web.

### 6. Facturación ARCA / CAE (etapa posterior)
- Emisión de CAE **desde el backend, no desde la PWA**: la PWA pide factura → backend autentica con
  ARCA (WSAA) → pide CAE (WSFE) → devuelve el CAE → la PWA imprime. Requiere internet al facturar
  (obligatorio por ley igual). Certificados centralizados en el backend, no en cada cliente.

## Orden de construcción sugerido

1. Supabase: proyecto + Auth + schema + RLS con `business_id`. (base de todo)
2. `SupabaseAdapter` en la capa de servicios, empezando por auth + productos + ventas + caja.
3. Migrar el resto de módulos al adaptador.
4. Suscripción: Mercado Pago + webhook + gate en login.
5. Landing page (registro + pago + instalación PWA).
6. Módulo e-commerce activable.
7. ARCA/CAE vía backend.

## Caveats conocidos
- **Impresión térmica**: la PWA imprime por el diálogo del navegador; el acceso directo ESC/POS a
  comanderas es limitado (Web USB/Serial, solo Chrome). No bloqueante para MVP; evaluar si un cliente
  exige comandera directa.
- **Offline**: con nube como fuente de verdad, el POS necesita internet. Agregar caché PWA + cola de
  operaciones para aguantar cortes cortos, pero la verdad sigue en la nube.

## Relación con los otros proyectos
- **Mostrador (este repo)** = molde/producto genérico que se productiza con este modelo.
- **Zafari (petshop-pos)** = ya usa Prisma + Supabase + e-commerce; es el caso real que valida la
  Opción A (nube como fuente de verdad con stock compartido local ↔ web).
