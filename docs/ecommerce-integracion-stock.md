# Spec — Integración de stock entre PWA/POS y e-commerce

> **Estado**: spec congelada, **futuro**. El usuario excluyó e-commerce del alcance actual
> ("no quiero que vincules al e-commerce por ahora"); esto queda capturado para cuando se retome.
> Depende de: Productos ✅ + **Inventario/Stock** + **Ventas** + idempotencia + auditoría (nada de eso
> con e-commerce se construye antes de tener esos dominios). Regla transversal: filtrar por `businessId`.

## Objetivo

Que un comercio que además vende online (web propia, WooCommerce, Shopify, Tiendanube, Mercado Shops,
Mercado Libre, custom) pueda **vincular el stock del SaaS con su tienda**: enviar stock actualizado, recibir
ventas online, descontar stock sin duplicar, mapear productos, ver errores y auditar sincronizaciones.

## Decisión central

**La PWA/POS (el SaaS) es la fuente de verdad del stock.** El e-commerce consulta o recibe actualizaciones;
**nunca** es la fuente real. El backend **siempre verifica el stock real antes de descontar**.

- Venta en local → baja stock en SaaS → emite `stock.updated` → el e-commerce actualiza.
- Venta online → el e-commerce avisa al SaaS → el SaaS verifica y descuenta → confirma el nuevo stock.

## Formas de integración (de menor a mayor complejidad)

1. **API propia del SaaS** (público): que cualquier tienda custom consulte productos/stock/precios y mande órdenes.
2. **Webhooks** salientes: el SaaS avisa cambios (`stock.updated`, `product.updated`, `price.updated`, `product.disabled`).
3. **Conectores por plataforma** (futuro): WooCommerce, Shopify, Tiendanube, Mercado Shops, Mercado Libre.
4. **Plugin** (futuro): p. ej. para WooCommerce.

## MVP (cuando se retome)

API propia (consultar productos/stock) + **webhook entrante de órdenes** + **mapeo por SKU** + sincronización
manual desde panel + logs de sync + estado de integración + notificaciones de error.
**Fuera del MVP**: plugins, integración completa Shopify/ML, variantes complejas, reservas avanzadas, multi-depósito online.
Prioridad de sync: **1º stock**, 2º precio, 3º productos completos.

## Flujos

- **Venta local**: verifica stock → descuenta → `inventory_movements` → emite `stock.updated` → e-commerce actualiza.
- **Venta online**: webhook entrante → valida orden + firma + **idempotencia** → busca productos por SKU externo →
  verifica stock → descuenta **una sola vez** → crea **venta/pedido online** + movimiento de inventario → responde OK.
- **Online sin stock**: rechaza / marca orden `stock_error` → **notifica** al comercio (revisar, ajustar, cancelar en la tienda).
- **Reservas de carrito**: MVP = descontar solo cuando la orden está **pagada/confirmada**. Futuro: reservar al iniciar
  checkout con expiración (`stock_reservations`).

## Mapeo de productos (el SKU es el vínculo)

El ID del producto difiere entre sistemas. **ecommerce_product_mappings**: `integration_id`, `product_id`,
`internal_sku`, `external_product_id`, `external_variant_id`, `external_sku`, `sync_stock`, `sync_price`,
`sync_name`, `last_synced_at`.

## Integraciones por negocio (Ajustes → Integraciones → E-commerce)

**ecommerce_integrations**: `platform` (custom_api/woocommerce/shopify/tiendanube/mercado_shops/mercado_libre/other),
`store_url`, `api_key_encrypted`, `api_secret_encrypted`, `webhook_secret`, `status`, `sync_stock_enabled`,
`sync_prices_enabled`, `sync_products_enabled`, **`stock_source_branch_id` / `stock_source_warehouse_id`**
(desde dónde sale el stock online — MVP: elegir una sucursal/depósito).

## Seguridad de la API pública

API keys **por negocio** (secretos cifrados), validar **firma de webhooks**, rate limiting, logs de acceso,
tokens revocables. **Nunca** aceptar `business_id` desde el frontend externo como fuente de verdad; nunca exponer
datos de otro negocio. **api_keys**: `name`, `key_hash`, `status`, `permissions` (read_products/read_stock/
write_orders/write_stock_reservations/read_prices), `last_used_at`, `revoked_at`.

## Idempotencia (crítico)

Los webhooks pueden llegar repetidos. **La misma orden externa no descuenta stock dos veces.**
**ecommerce_orders**: `integration_id`, `external_order_id`, `internal_sale_id`, `status`
(received/processing/processed/stock_error/cancelled/refunded/failed), `payment_status`, `fulfillment_status`,
`total`, `raw_payload`. **Único: `(business_id, integration_id, external_order_id)`.**

## Tablas restantes

- **outgoing_webhooks**: `integration_id`, `event_type`, `url`, `secret`, `is_active` (avisos salientes).
- **ecommerce_sync_logs**: `integration_id`, `direction` (incoming/outgoing/manual), `event_type`, `status`
  (success/failed/pending/retrying/ignored), `product_id`, `external_product_id`, `external_order_id`,
  `message`, `request_payload`, `response_payload`.
- **stock_reservations** (futuro): `product_id`, `external_cart_id`, `quantity`, `status`
  (reserved/confirmed/released/expired), `expires_at`.

## Backend

Servicios: `ecommerceIntegrationService`, `ecommerceStockSyncService`, `ecommerceProductMappingService`,
`ecommerceWebhookService`, `ecommerceOrderService`, `apiKeyService`, `webhookSignatureService`, `syncLogService`,
`notificationService`, `auditService`.

- **Internos**: `GET/POST /api/ecommerce/integrations`, `GET/PUT /api/ecommerce/integrations/:id`,
  `POST .../:id/test`, `POST .../:id/sync-stock`, `GET .../:id/logs`,
  `GET/POST/PUT/DELETE /api/ecommerce/product-mappings[/:id]`, `GET /api/ecommerce/orders`.
- **Públicos** (API externa): `GET /public-api/products`, `GET /public-api/products/:sku[/stock]`,
  `POST /public-api/orders`, `POST /public-api/stock/{reserve,release}`.
- **Webhooks entrantes**: `POST /api/ecommerce/webhooks/:integrationId/{order-created,order-paid,order-cancelled,order-refunded}`.

## Frontend

Páginas: `EcommerceIntegrationsPage`, `EcommerceIntegrationDetailPage`, `ProductMappingsPage`,
`EcommerceOrdersPage`, `EcommerceSyncLogsPage`. Componentes: `EcommerceConnectionCard`,
`IntegrationStatusBadge`, `ProductMappingTable/Modal`, `SyncNowButton`, `WebhookLogsTable`,
`EcommerceOrderStatusBadge`, `StockSyncErrorAlert`. Panel de sincronización: plataforma, estado de conexión,
última sync, productos vinculados/con error, órdenes recibidas, webhooks fallidos, "sincronizar ahora",
probar conexión, reintentar, desactivar.

## Notificaciones y auditoría

Notificar: e-commerce conectado, error al actualizar stock online, orden online recibida, orden sin stock,
producto sin mapeo, webhook fallido, credenciales inválidas, sync finalizada. Auditar: integración creada/
modificada/desactivada, API key creada/revocada, producto vinculado/desvinculado, stock sincronizado, orden
online recibida/fallida, webhook rechazado.

## Reglas críticas

1. El stock del SaaS es la fuente de verdad. 2. No descontar stock dos veces por la misma orden (idempotencia
por `external_order_id`). 3. No mezclar datos entre negocios. 4. Validar API keys + firma de webhooks.
5. El backend siempre verifica stock real antes de descontar. 6. Vincular por SKU/mapeo externo. 7. Registrar
todos los errores de sync. 8. Notificar si una orden online no se pudo procesar. 9. Permitir reintentar sync.
10. **Desactivar la integración no debe romper el POS.** 11. **Un producto externo NO mapeado no descuenta stock.**
12. **El `businessId` sale SIEMPRE de la API key / integración validada**, nunca de un frontend externo.

## Reglas de implementación (no romper lo existente)

Antes de tocar código, **analizar la arquitectura actual**: cómo está modelado producto/stock, cómo descuenta
el POS, cómo se registran `inventory_movements`, cómo se maneja `businessId`/`branchId`/`warehouseId`, auditoría,
notificaciones, manejo de errores, y qué endpoints ya existen. Luego:

- **Módulo nuevo y aislado** (`ecommerce`), servicios separados — **no** meter la lógica en controllers
  existentes, ni todo en un solo controller/función. La venta local sigue **exactamente igual**, y además
  puede **disparar** `stock.updated` cuando corresponda.
- **No hardcodear plataformas.** No asumir que todos los negocios tienen e-commerce, ni que todos los
  productos están mapeados / tienen SKU externo, ni que stock y precio se sincronizan siempre.
- Cada **negocio** activa/desactiva la integración; cada **producto (mapping)** decide si sincroniza
  `stock`, `precio` y/o `datos` (`syncStock`/`syncPrice`/`syncName` por mapping).
- No romper: **POS, stock, cierre de caja, reportes, auditoría**.

## Origen de venta (`sale.source`) — diferenciar online vs local

La venta debe registrar su origen para reportes. Campo `sale.source`: `pos | ecommerce | manual | import | other`.
Para ventas online: `source = ecommerce`, `externalOrderId = <id externo>`, `integrationId = <id integración>`.
Permite filtrar ventas por local físico / online / plataforma / integración.

## Transacción atómica del pedido online (todo o nada)

Procesar la orden online **dentro de una transacción**. Orden de pasos: validar integración + firma +
`external_order_id` → si ya existe `ecommerce_order` en `processed` **no re-descontar** → si no, crear
`ecommerce_order` en `processing` → buscar productos por SKU/mapping → **verificar stock real** → si falta,
marcar `stock_error` + notificar + log (**sin** descontar) → si alcanza: crear venta/pedido online + `sale_items`
+ `payment` (si aplica) → **descontar stock** → `inventory_movements` → `cash_movement` solo si el modelo lo
requiere → `audit_log` → marcar `ecommerce_order = processed` → **commit**. Si falla cualquier paso crítico:
**rollback total** (sin venta parcial, sin stock parcial, sin movimientos inconsistentes), error controlado + notificación.

## Detalle de API keys y estados

- **api_keys**: guardar **hash** (`keyHash`), nunca texto plano; `keyPrefix` para identificarla; mostrar la key
  completa **una sola vez** al crearla; en la UI enmascarar (`•••• •••• •••• 8F2A`). Campos: `permissions`
  (read_products/read_stock/write_orders/write_stock_reservations/read_prices), `status`, `lastUsedAt`, `revokedAt`.
- **Integration status**: `active | inactive | error | pending_setup | disconnected`.
- **ecommerce_product_mappings**: único `(businessId, integrationId, productId)`.
- **ecommerce_orders**: suma `errorMessage`; único `(businessId, integrationId, externalOrderId)`.
- Secretos externos (`api_secret`, `access_token`, `refresh_token`) **cifrados**; nunca exponerlos en frontend.

## Auditoría (taxonomía de eventos)

`ecommerce.integration.{created,updated,disabled,tested}`, `ecommerce.api_key.{created,revoked}`,
`ecommerce.product_mapping.{created,updated,deleted}`, `ecommerce.stock.sync.{started,completed,failed}`,
`ecommerce.order.{received,processed,stock_error}`, `ecommerce.webhook.{rejected,processed}`.

## Dependencias / roadmap

Va **después** de Productos ✅ + Stock/Inventario + Ventas + idempotencia + auditoría (y stock por sucursal, o
al menos stock base). Orden interno: modelo de integraciones → API keys → mapeo por SKU → endpoint público de
stock → webhook entrante de orden → descuento de stock online → logs → panel → sync manual → webhooks salientes
`stock.updated` → conectores por plataforma.
