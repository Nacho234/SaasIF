# Estándar de producción — Blindaje SaaS multiusuario y concurrente

> **Qué es este documento.** No es una feature: es el **reglamento** que toda PR de backend
> debe cumplir. Los requisitos de acá **no se implementan sueltos**; se aplican *dentro* de la
> fase de dominio que corresponde (la transacción va en Ventas, el control de stock concurrente
> también, el guard de suscripción se usa cuando hay endpoints que proteger, etc.).
> La sección final mapea cada requisito a su fase.

## 0. Principio rector

El sistema se diseña como **SaaS multiusuario y concurrente**, no como app de un solo usuario.
En cualquier momento puede haber muchos negocios, varios usuarios por negocio, varias sucursales,
varias cajas abiertas, varios vendedores vendiendo a la vez, y procesos automáticos en paralelo
(webhooks, importaciones, ARCA, cierres, backups, reportes).

**El backend es la única fuente de verdad. El frontend nunca decide `businessId` ni permisos reales.**

## 1. Reglas de oro (no negociables)

1. **Nunca** una consulta/mutación sin filtrar por `businessId`.
2. `businessId` se toma **siempre del token** (`@CurrentUser().businessId`), nunca de params/body del frontend.
3. Los permisos se validan **en el backend** en cada endpoint (los del frontend son solo UX).
4. Toda operación que toca varias tablas va en **una transacción** (`prisma.$transaction`).
5. Las operaciones críticas son **idempotentes** (misma `idempotency_key` → misma respuesta, sin repetir efecto).
6. El **stock** se verifica y descuenta **dentro de la transacción**, con bloqueo, nunca confiando en el stock del frontend.
7. Nunca exponer stack traces al cliente; se loguean internamente.
8. No salir a producción sin: backups probados, logs, staging, y testing de concurrencia.

## 2. Capa de guards/middlewares (orden obligatorio)

Cada request protegida pasa por esta cadena, en este orden:

| Guard/Middleware | Responsabilidad | Estado |
|---|---|---|
| `JwtAuthGuard` | Usuario autenticado (JWT válido). | ✅ hecho (Fase 1) |
| `TenantContext` (`@CurrentUser`) | Inyecta `businessId` desde el token. | ✅ hecho (Fase 1) |
| `SubscriptionGuard` | Suscripción en `trial` o `active`. Bloquea `past_due/cancelled/expired/blocked`. | ⏳ al 1er endpoint de dominio |
| `PermissionGuard` (`@RequirePermission`) | Valida el permiso del endpoint. | ⏳ al 1er endpoint de dominio |
| `PlanLimitGuard` | Respeta límites del plan (usuarios, sucursales, productos, ventas/mes, módulos). | ⏳ Fase suscripciones |
| `RateLimit` | Anti fuerza bruta (login) y abuso general. | ⏳ próxima |

Permisos backend (mismos nombres que el frontend): `sell`, `open_cash`, `close_cash`,
`register_expenses`, `create_discount`, `cancel_sale`, `create_return`, `edit_products`,
`adjust_stock`, `manage_purchases`, `view_reports`, `manage_users`, `manage_settings`,
`view_audit`, `reset_demo`.

## 3. Aislamiento multi-tenant

- **Todas** las tablas operativas llevan `businessId` (y `branchId` donde aplique).
- Tablas con `businessId`: products, categories, brands, customers, suppliers, sales, sale_items,
  sale_payments, cash_registers, cash_movements, inventory_movements, purchases, purchase_items,
  returns, expenses, promotions, combos, business_settings, payment_settings, audit_logs,
  notifications, fiscal_settings, fiscal_invoices, product_imports.
- Tablas que además llevan `branchId`: sales, cash_registers, cash_movements, inventory_movements,
  stock_by_branch, expenses, cash_closures.
- **Red de seguridad recomendada**: una extensión de Prisma (`$extends`) que inyecte el filtro
  `businessId` automáticamente en find/update/delete, para que sea *imposible* olvidarlo. Además
  del filtro explícito en cada servicio.
- **Test obligatorio por dominio**: un negocio no puede leer/modificar datos de otro.

## 4. Idempotencia

Problema: doble click, reintentos de red, webhooks repetidos, ARCA lento, Excel subido dos veces.

Solución: tabla `idempotency_keys` + interceptor que, ante la misma `key`, devuelve la respuesta
previa sin repetir el efecto.

```
idempotency_keys(
  id, business_id, key, operation, request_hash,
  response_body, status, created_at, expires_at
)
```

Operaciones que la usan: crear venta, confirmar pago, abrir caja, cerrar caja, movimiento manual
de caja, importar Excel, webhook de suscripción, solicitar CAE, reintentar CAE, pago de cuenta
corriente, devolución, anular venta. Además, claves específicas:
`sales.idempotency_key`, `subscription_payments.provider_event_id`, `fiscal_invoices.idempotency_key`,
`product_imports.import_key`, `webhook_events.provider_event_id`.

## 5. Transacciones críticas

**Toda venta es transaccional.** Dentro de un solo `$transaction`:
verificar (usuario, permiso, suscripción, `businessId`, caja abierta, stock) → crear venta →
items → pagos → descontar stock → movimientos de inventario → movimiento de caja →
actualizar deuda (si cta. cte.) → auditoría → commit. Si algo falla: **nada parcial**, error claro.

Mismo criterio para: cierre de caja, anulación, devolución, recepción de compra, pago de deuda.

## 6. Concurrencia

- **Stock**: verificar + descontar en la misma transacción con bloqueo de fila
  (`SELECT ... FOR UPDATE` / update condicional `WHERE stock >= qty`). Si no alcanza → rechazar con
  *"El stock fue actualizado por otra operación."* Evita stock negativo por ventas simultáneas.
- **Caja**: no cerrar dos veces, no dos cierres simultáneos (bloqueo/estado), no movimientos sobre
  caja cerrada, reapertura solo admin + auditoría.
- **Ventas**: una venta se confirma una sola vez (estado `draft/processing/paid/...` + idempotencia).
  El backend rechaza duplicados aunque el frontend falle.
- **ARCA**: no pedir CAE dos veces por la misma venta; no reintentar si ya hay CAE autorizado;
  bloquear reintentos simultáneos sobre la misma `fiscal_invoice`; registrar todos los intentos.
- **Importaciones**: `import_key` para no duplicar por reintento; estado
  `pending/processing/completed/completed_with_errors/failed/cancelled`.

Estados de venta: `draft`, `processing`, `paid`, `cancelled`, `returned`, `failed`.

## 7. Rendimiento e índices

Índices mínimos: `products(business_id)`, `products(business_id, sku)` único,
`sales(business_id, created_at)`, `sales(business_id, branch_id, created_at)`,
`cash_registers(business_id, branch_id, status)`,
`inventory_movements(business_id, product_id, created_at)`,
`customers(business_id, document)`, `fiscal_invoices(business_id, status)`,
`audit_logs(business_id, created_at)`.
Paginación y filtros **en backend**; reportes calculados en backend; nada de miles de filas al frontend.

## 8. Auditoría inalterable

`audit_logs(id, business_id, branch_id, user_id, action, module, entity_type, entity_id,
description, old_value, new_value, metadata, ip_address, user_agent, created_at)`.
No editable por usuarios normales. Registra login/logout, ventas, anulaciones, devoluciones,
caja (abrir/cerrar/reabrir), ajustes de stock, cambios de precio/producto, usuarios/permisos,
import Excel, ARCA (error/CAE/reintento), reimpresión, suscripción vencida, bloqueo de negocio, cambio de plan.

## 9. Backups, logs y ambientes

- **Backups**: diario automático de Postgres, antes de cada migración, retención (30 días diarios /
  3 meses semanales). **Restauración probada en staging** (nunca en producción). Export por negocio.
- **Logs y monitoreo**: errores de backend/frontend/DB/ARCA/pagos/Excel/impresión/webhooks/timeouts,
  con severidad `info/warning/error/critical` y alertas críticas (DB caída, backend caído, muchos 500,
  webhooks fallando, backups fallidos).
- **Ambientes**: `development` / `staging` / `production`, con variables separadas
  (`DATABASE_URL`, `JWT_SECRET`, `MERCADO_PAGO_*`, `ARCA_MODE/CERT`, `STORAGE_*`, `EMAIL_*`).
  Migraciones se prueban en staging + backup antes de producción + plan de rollback.

## 10. Panel interno Admin SaaS + modo soporte

Panel **para el dueño del SaaS** (no para los comercios): negocios, usuarios, plan, estado de
suscripción, último pago/acceso, bloquear/reactivar negocio, errores recientes, ARCA con error,
webhooks fallidos, imports fallidos, uso, auditoría general. Acciones peligrosas
(cambiar plan, bloquear, reintentar webhook/ARCA) → auditoría interna.
**Modo soporte**: solo superadmin, pide motivo, banner visible "Modo soporte activo", audita a qué
negocio se accedió y por qué.

## 11. Otros requisitos de producción

- **Impresión (MVP)**: `window.print()` + PDF + reimpresión desde historial + hoja de cierre.
  Reimprimir **no** crea venta, no mueve stock/caja, no pide CAE nuevo. Térmica directa: app puente local (futuro).
- **Contingencia sin internet (MVP)**: sin conexión, **no** confirmar ventas reales ni emitir factura;
  permitir consulta cacheada. Venta offline completa → futuro.
- **Excel seguro**: upload → validar (tipo, tamaño, columnas, precio/stock no negativos, SKU único por
  `businessId`, filas máx por plan) → preview → errores por fila → confirmar → crear/actualizar por SKU → auditoría.
- **Notas de crédito**: una venta fiscal con CAE **no se borra**; se revierte con devolución / nota de
  crédito / estado fiscal. Preparar `returns`, `return_items`, `credit_notes`, `fiscal_credit_notes`.
- **Límites por plan**: `max_users`, `max_branches`, `max_products`, `max_monthly_sales`,
  `enable_arca`, `enable_advanced_reports`, `enable_advanced_payments`, `enable_excel_import`.
- **Seguridad**: HTTPS, JWT con expiración + refresh, rate limiting en login, validación/sanitización
  de todo input y del Excel, CORS correcto, secretos solo en backend.
- **Legal mínimo**: términos, privacidad, responsabilidad fiscal del comercio, política de suspensión
  por falta de pago, de backups y de soporte. Validar textos con profesional.

## 12. Mapa requisito → fase de implementación

| Requisito | Dónde se implementa |
|---|---|
| Multi-tenant `businessId` + red de seguridad Prisma | Base: al crear cada tabla de dominio (desde Fase Productos) |
| `SubscriptionGuard`, `PermissionGuard`, rate limiting | Fase Middlewares (antes de Productos) |
| Idempotencia (tabla + interceptor) | Fase Middlewares; se aplica en Ventas/Pagos/Webhooks/ARCA/Import |
| Transacción de venta + stock concurrente | Fase POS/Ventas |
| Control de caja concurrente | Fase Caja |
| Import Excel seguro | Fase Excel |
| Auditoría inalterable | Fase Auditoría (y se escribe desde cada dominio) |
| Índices | Con cada tabla creada |
| Backups / logs / staging | Fase Ops (antes de producción) |
| Admin SaaS + modo soporte | Fase Panel interno |
| Límites por plan | Fase Suscripciones |
| Notas de crédito fiscales | Fase ARCA |
| Impresión / contingencia / legal | Pre-producción |

## 13. Checklist mínimo antes de producción

Backend real · PostgreSQL · `businessId` en tablas críticas · Auth real · Permisos backend ·
Suscripción/trial · Productos reales · Excel con preview · Caja real · Ventas transaccionales ·
Stock seguro · Concurrencia controlada · Idempotencia en críticas · Cierre de caja + hoja ·
Auditoría · Backups automáticos probados · Logs backend · Manejo global de errores ·
Panel de soporte mínimo · Staging · Impresión básica · Términos y privacidad · Testing piloto ·
Testing de concurrencia.
