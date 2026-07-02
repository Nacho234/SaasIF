# Roadmap — Módulos funcionales pendientes para completar el SaaS

> **Estado**: roadmap/spec. Cataloga los módulos que faltan para que el SaaS quede completo, con sus
> dependencias y fase. NO se construye todo ahora: la mayoría cuelga del dominio **Ventas** (aún no
> construido) o es una expansión de algo que ya existe. Se implementa **por fases, sin romper lo actual**.
> Regla transversal en todos: filtrar por `businessId`, validar permisos en **backend**, auditar lo importante.

## Clasificación por dependencia (qué se puede cuándo)

| Módulo | Depende de | Cuándo |
|--------|-----------|--------|
| 1. Roles y permisos detallados | Nada (expande el RBAC actual) | Puede ir temprano; expansión incremental |
| 2. Onboarding del comercio | Domina lo que exista (checklist crece con los módulos) | Incremental |
| 3. Compras / proveedores / ingreso de stock | Productos ✅ + Inventario | Después de Inventario backend |
| 4. Devoluciones / cambios | **Ventas** + Inventario + Caja | Post-Ventas |
| 5. Cuenta corriente | **Ventas** + Clientes | Post-Ventas |
| 6. Multi-sucursal / transferencias | Inventario + Branch (existe en schema) | Post-Inventario |
| 7. Códigos de barras / scanner / etiquetas | Productos ✅ | Puede ir temprano |
| 8. Exportaciones | Los dominios a exportar | A medida que existan |
| 9. Notificaciones | Eventos de los dominios | Incremental (base temprano) |
| 10. Soporte in-app | Nada | Independiente, cuando se quiera |
| 11. UX final / errores | Transversal | Continuo |

**El desbloqueante sigue siendo Ventas.** 4 y 5 dependen directamente; 3, 6, 8, 9 crecen con los dominios.

---

## 1. Roles y permisos detallados (evolución del RBAC actual)

Hoy el sistema tiene roles **hardcodeados** (admin/manager/seller → `ROLE_PERMISSIONS`, `PermissionGuard`).
Este módulo evoluciona a **RBAC dinámico en DB**: roles configurables por negocio + permisos granulares.

- **Roles estándar**: Dueño, Administrador, Encargado, Cajero, Vendedor, Stock/Depósito, Compras, Contador,
  Solo lectura, Soporte SaaS (interno, todo auditado).
- **Permisos (~25)**: `sell`, `view_products`, `manage_products`, `view_stock`, `adjust_stock`,
  `transfer_stock`, `open_cash`, `close_cash`, `view_cash`, `manage_cash_movements`, `cancel_sale`,
  `create_return`, `create_exchange`, `manage_customer_credit`, `view_reports`, `export_data`,
  `manage_users`, `manage_roles`, `manage_settings`, `manage_payment_methods`, `manage_suppliers`,
  `manage_purchases`, `view_fiscal_data`, `manage_fiscal_settings`, `reprint_receipts`.
- **Tablas**: `roles` (business_id, name, is_system_role), `permissions` (key, module), `role_permissions`,
  `user_roles` (user_id, role_id, branch_id).
- **Regla crítica**: el frontend oculta botones, pero **cada endpoint valida permisos en backend**. (Ya se cumple
  con `PermissionGuard`; hay que ampliar el set de permisos y hacerlos DB-backed cuando se necesiten roles custom.)

## 2. Onboarding inicial del comercio

Guiar al comercio recién registrado hasta su **primera venta**. Hoy existe `completeOnboarding` básico;
esto lo vuelve un **checklist con estado persistido**.

- Pasos: datos del negocio → 1ª sucursal → caja → medios de pago → productos (manual/Excel/ejemplo/saltar) →
  usuarios → venta de prueba → finalizar.
- Tabla `business_onboarding` (flags: `business_data_completed`, `branch_created`, `cash_configured`,
  `payment_methods_configured`, `products_loaded`, `users_invited`, `first_sale_completed`, `onboarding_completed`).
- UX: checklist visible con progreso. El checklist **crece** a medida que existen los módulos.

## 3. Compras, proveedores e ingreso de stock

El stock no entra solo por ajuste manual: debe **entrar por compras**. Depende de Inventario.

- **suppliers**: name, cuit, tax_condition, contacto, is_active.
- **purchases** (draft/pending/received/partially_received/cancelled) + **purchase_items** (product_id,
  quantity, unit_cost, subtotal).
- Flujo: crear compra → proveedor → ítems + costos → confirmar recepción → **sube stock** + `inventory_movements`
  (`type: purchase_in`, `related_purchase_id`) → actualiza costo del producto si corresponde.
- Reposición: alertas de stock bajo (actual vs mínimo, cantidad sugerida, proveedor sugerido).

## 4. Devoluciones y cambios (post-Ventas)

### Devoluciones
Buscar venta original → seleccionar producto/cantidad → motivo → **¿vuelve a stock?** → método de devolución
del dinero → confirmar → auditar. Stock: vuelve si está sano; a dañado/merma si no; no vuelve si no se recupera.

### Cambios con diferencia de precio (caso clave)
Cliente devuelve un producto y se lleva otro; el sistema **calcula la diferencia**. Ej: devuelve Coca $1.500,
se lleva Pepsi $2.200 → **paga $700**. Casos: nuevo más caro (paga diferencia), más barato (saldo a favor:
devolver / cuenta corriente / usar en compra), igual (solo mueve stock). Registra: devolución + salida del
nuevo + pago/saldo de la diferencia + movimientos de stock/caja.

- **returns** (type: refund/exchange/partial_return; difference_direction: customer_pays/business_refunds/even),
  **return_items** (restock, stock_condition), **exchange_items**, **return_payments**
  (additional_payment/refund_to_customer/customer_credit).
- Reglas: no devolver más que lo comprado; no sobre venta anulada; no stock automático si no vuelve sano;
  si había factura → nota de crédito (+ nueva factura si corresponde, ver `contracargos-notas-credito.md`); todo auditado.

## 5. Cuenta corriente (post-Ventas)

Ventas fiadas, pagos parciales, saldos a favor, límite de crédito, bloqueo por deuda, historial, recibo.

- **customer_accounts** (customer_id, current_balance, credit_limit, is_blocked), **customer_account_movements**
  (type: debt/payment/credit/adjustment/refund/exchange_difference, sale_id/return_id, amount).
- Flujo: venta con método "cuenta corriente" → suma deuda; pago posterior → descuenta. Notificar al superar el límite.

## 6. Multi-sucursal y transferencias de stock

Preparar negocios con >1 sucursal/depósito. `branches` existe en el schema; falta stock **por ubicación**.

- **warehouses** (branch_id, type: store/deposit/central/damaged_stock), **stock_by_location**
  (product_id, branch_id, warehouse_id, quantity).
- **stock_transfers** (draft/sent/received/cancelled) + **stock_transfer_items**. Flujo: crear → origen/destino
  → ítems → confirmar salida (baja origen) → confirmar recepción (sube destino).
- Reglas: no transferir más del disponible; no confirmar recepción dos veces; no editar transferencia recibida
  sin auditoría; historial por producto.

## 7. Códigos de barras, scanner y etiquetas

Vender más rápido. Depende solo de Productos.

- Producto suma: SKU interno, código de barras principal, código de proveedor, alternativos →
  **product_barcodes** (barcode, type: ean/internal/supplier/alternative, is_primary).
- Scanner = teclado: foco en buscador → escanea → 1 match agrega al carrito / varios muestra selección /
  ninguno → alerta ("¿crear o asociar?").
- Etiquetas imprimibles (nombre, precio, SKU, barcode, logo opcional); tamaños: chica, góndola, adhesiva, A4 múltiple.

## 8. Exportaciones

Que dueño/encargado/contador descarguen info. Exportables: ventas, productos, clientes, stock, movimientos,
cierres, compras, proveedores, cuenta corriente, comprobantes fiscales, notas de crédito, contracargos, auditoría.

- Formatos: XLSX, CSV, PDF (reportes cerrados). Reglas: validar permisos, filtrar por business_id/fecha/sucursal,
  **nunca** exportar datos de otro negocio, auditar la exportación, limitar pesadas (grandes en background, futuro).
- Tabla opcional **export_jobs** (type, filters, status: pending/processing/completed/failed, file_url).

## 9. Notificaciones

Avisar eventos importantes. Eventos: stock bajo, caja abierta hace muchas horas, caja con diferencia, CAE con
error, comprobante pendiente de CAE, Excel con errores, contracargo recibido, pago de suscripción rechazado,
suscripción por vencer, usuario nuevo, producto sin stock, transferencia/compra pendiente de recepción,
cliente superó límite de cuenta corriente.

- Tipos: info/warning/error/critical/success. MVP: in-app (campana + panel). Futuro: email/WhatsApp/push PWA.
- Tabla **notifications** (type, title, message, module, entity_type, entity_id, is_read).
- Reglas: no saturar, agrupar repetidas, marcar leída, filtrar por tipo, críticas arriba.

## 10. Soporte dentro del sistema

Reducir dependencia de WhatsApp. Módulo "Ayuda y soporte": centro de ayuda, FAQ, guías rápidas
(abrir caja, vender, cargar productos, importar Excel, cerrar caja, devolución, cambio, compra, crear usuarios,
errores de CAE), botón WhatsApp, formulario, **tickets** (`support_tickets`: subject, message, status:
open/in_progress/resolved/closed, priority: low/medium/high/critical, module). Ayuda **contextual** por módulo.

## 11. UX final, mensajes de error y soporte al usuario (transversal)

- **Estados obligatorios**: loading, error, sin resultados, sin conexión, procesando, confirmado, acción
  bloqueada, permiso insuficiente.
- **Errores entendibles, no técnicos**: en vez de "Error 500" → "No se pudo confirmar la venta. Verificá la
  conexión."; "Forbidden" → "No tenés permiso. Pedile autorización a un encargado."; "Stock conflict" → "No hay
  stock suficiente. Otro usuario pudo haber vendido este producto."
- Confirmar acciones peligrosas (anular venta, cerrar/reabrir caja, eliminar producto, ajustar stock, cambiar
  permisos, nota de crédito, contracargo). Deshabilitar botones críticos mientras procesa (**+ idempotencia en backend**).
- Responsive real: POS en tablet, cierre/reportes en PC, consulta en celular.

## Orden recomendado (del handoff, reconciliado con "core primero")

Primero **el core**: Clientes → Caja backend → **Ventas** → (fiscal/pagos, ya spec'd). Recién con Ventas viva,
estos módulos: 1. Roles detallados → 2. Onboarding → 3. Códigos de barras → 4. Compras/stock-in →
5. Devoluciones → 6. Cambios → 7. Cuenta corriente → 8. Multi-sucursal → 9. Exportaciones → 10. Notificaciones
→ 11. Soporte → 12. UX final. (Los transversales —UX, notificaciones base, roles— se van sumando en el camino.)

## Auditoría obligatoria (en todos)

Cambio de rol/permisos, fin de onboarding, compra, ingreso/transferencia de stock, devolución, cambio,
pago de diferencia, saldo a favor, movimiento de cuenta corriente, código de barras creado, etiqueta impresa,
exportación, notificación crítica, ticket de soporte. Guardar `business_id, branch_id, user_id, entity, action,
description, metadata, created_at`.
