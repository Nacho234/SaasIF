# Capa de servicios — demo vs producción

Esta carpeta separa **lógica de negocio** de **acceso a datos**, para poder pasar de modo
demo (datos locales) a producción (Supabase) sin reescribir la UI.

## Modos

Controlado por `VITE_APP_MODE` (ver `src/config/appMode.ts`):
- `demo` (default): datos falsos locales. Se siembra el escenario demo (`src/demo/`).
- `prod`: backend real (Supabase). No siembra datos falsos. Todavía en construcción.

## Estructura

```
src/services/
  ports/       Contratos (interfaces async). El "schema" del acceso a datos.
  api/         Implementación producción (Supabase). Hoy STUBS que lanzan NotImplementedError.
  adapters/    Elige demo o prod según el modo y expone `repositories`.
  <*.ts>       Lógica de negocio actual (ventas, caja, devoluciones, etc.).

src/demo/
  demoDataService.ts   Genera el escenario demo y lo siembra en los stores.
  mocks/               Datos falsos base (productos, clientes, proveedores, usuarios).
  repositories/        Implementación demo de los ports (envuelve los stores).
```

## Regla

Las pantallas consumen `repositories` desde `@/services/adapters`, **no** importan
mocks ni Supabase directamente.

## Estado (Fase 0)

Costura creada y funcionando con **`products` como dominio de referencia** cableado de
punta a punta (port → demo → api-stub → adapter). La app sigue operando en modo demo
usando los stores/servicios existentes; la migración del resto de dominios y de las
pages al adapter es trabajo de la **Fase 2** (ver `docs/HANDOFF-arquitectura-produccion.md`).
