# Spec — ARCA, facturación fiscal y ticket interno

> **Estado**: spec congelada para la **fase Fiscal** (MVP 3, después de Ventas). NO se implementa
> todavía: depende del dominio de **Ventas** y es integración pesada con los web services de
> ARCA/AFIP (certificados, WSAA, WSFE). La parte de **medios de pago** está en `pagos-avanzados.md`.

## Decisión central (afecta el diseño de hoy)

**ARCA NO es obligatorio para usar el sistema.** Un comercio se suscribe y usa caja, productos,
stock, clientes, ventas y **ticket interno** sin ARCA. ARCA solo hace falta para emitir **facturas
fiscales reales con CAE**. → Esto **ya es como está construido**: registrarse crea el negocio y se
puede usar todo; los datos fiscales son opcionales.

## Tres niveles independientes

1. **Cuenta SaaS**: registro, login, suscripción.
2. **Negocio configurado**: caja, productos, stock, clientes, ventas internas, tickets.
3. **ARCA configurado**: facturas fiscales con CAE (opcional).

Un negocio puede estar: *suscripción activa + negocio configurado + ARCA no configurado* → vende y
opera con **ticket interno**, sin factura fiscal. Perfecto y permitido.

## Estados (independientes entre sí)

- **Negocio**: `activo | incompleto | bloqueado`.
- **Suscripción**: `trial | activa | vencida | cancelada | bloqueada`.
- **Fiscal del negocio**: `no_configurado | datos_cargados | pendiente_autorizacion | activo | error | deshabilitado`.
- **Fiscal de la venta**: `not_required | internal_only | pending | authorized | rejected | error`.

Validación para **usar el SaaS**: usuario + negocio + `businessId` + suscripción activa/trial + config
básica. **NO** exige ARCA.
Validación para **emitir factura fiscal**: CUIT + condición fiscal + punto de venta + ARCA autorizado +
prueba de conexión OK + tipo de comprobante definido.

## Ticket interno vs factura fiscal

- **Ticket interno**: se genera **siempre**. Sirve para caja, stock, historial, comprobante interno.
  Sin validez fiscal necesaria.
- **Factura fiscal**: solo si ARCA está activo. Tiene CAE, vencimiento de CAE, número fiscal, y se
  emite con el **CUIT del comercio** (nunca el del SaaS).

Al confirmar venta: si ARCA no configurado → ticket interno; si configurado → backend pide CAE →
factura autorizada; si ARCA falla → según config: **modo seguro** (no confirma hasta CAE) o
**modo práctico** (registra la venta y queda factura pendiente). Para la 1ª versión fiscal: modo seguro.

## Datos fiscales

**Del negocio (fiscal_settings)**: `cuit`, `razon_social`, `condicion_fiscal`, `punto_venta`,
`tipo_comprobante_default`, `arca_mode`, `arca_status`, `delegation_status`.
**Del cliente**: `nombre/razon_social`, `CUIT/CUIL/DNI`, `condicion_fiscal`
(Responsable Inscripto | Monotributista | Exento | Consumidor Final), dirección fiscal opcional.

## Reglas de tipo de comprobante (las decide el sistema, no el vendedor)

- Emisor **Responsable Inscripto** + cliente **RI** → **Factura A** (A/A con leyenda/M según corresponda).
- Emisor **RI** + cliente **Monotributista / Consumidor Final / Exento** → **Factura B**.
- Emisor **Monotributista** → **Factura C**.

**UX del POS**: el vendedor solo responde "¿pide factura?". Si sí, busca/crea cliente por CUIT, el
sistema lee ambas condiciones fiscales y **sugiere el comprobante**; el vendedor confirma. Nunca tiene
que entender reglas fiscales.

## ARCA en el backend, nunca en el frontend

El frontend no maneja certificados, tokens, claves ni requests a ARCA. Servicios backend:
`arcaService`, `arcaAuthService` (WSAA), `arcaInvoiceService` (WSFE/CAE), `arcaCertificateService`,
`fiscalSettingsService`, `fiscalInvoiceService`. Concurrencia: no pedir CAE dos veces por la misma
venta; no reintentar si ya hay CAE autorizado; bloquear reintentos simultáneos por `fiscal_invoice`;
registrar todos los intentos (ver estándar de producción, sección ARCA).

## Tablas (fase Fiscal) — multi-tenant por `businessId`

- **fiscal_settings** (1 por negocio): campos de arriba.
- **fiscal_invoices**: `business_id`, `branch_id`, `sale_id`, `cuit_emisor`, `punto_venta`,
  `tipo_comprobante`, `numero_comprobante`, `cae`, `cae_expiration`, `importe_total`, `status`,
  `arca_request`, `arca_response`, `error_message`.
- **arca_errors**: `business_id`, `sale_id`, `code`, `message`, `raw_response`.
- **Notas de crédito** (para revertir ventas fiscales con CAE, no se borran): ver estándar de producción.

## Alcance por MVP

- **MVP producción (ahora/próximo)**: usar el sistema **sin ARCA** + ticket interno + guardar datos
  fiscales del comercio y del cliente (campos preparados) + POS con medios simples + pago mixto.
- **MVP fiscal (después)**: configuración ARCA, validación, punto de venta, WSAA/WSFE, CAE,
  Factura A/B/C, estados fiscales de venta.
- **MVP conciliación (más adelante)**: procesadores, terminales, marcas, cuotas, lotes, comisiones,
  acreditaciones, reportes por procesador — todo en `pagos-avanzados.md`.

## Errores de CAE, reintentos y reimpresión (deep-dive operativo)

El problema central: la venta puede registrarse OK (pago, stock, caja) pero **fallar el CAE**
(internet caído, timeout, ARCA caído, certificado/token vencido, punto de venta mal configurado,
CUIT inválido, tipo de comprobante incompatible, error de impresión). El sistema debe manejarlo
**sin duplicar ventas ni comprobantes, y sin perder trazabilidad**.

### Regla de oro
**La venta se crea una sola vez.** El CAE se autoriza o se reintenta **sobre la misma venta/`fiscal_invoice`**.
La reimpresión **nunca** crea otra venta ni pide otro CAE.

### Estados fiscales (versión detallada — reemplaza la lista simple de arriba)
`not_required | internal_only | pending_cae | requesting_cae | cae_authorized | cae_error |
retry_pending | retrying | cancelled_fiscally`. Van **separados** del estado de venta
(`created | paid | cancelled | returned`): una venta puede estar `paid` con fiscal `cae_error`.

### Los 4 casos a resolver
1. **Sin internet antes de pedir CAE** → venta `paid`, fiscal `pending_cae`/`cae_error`; se imprime
   **ticket interno pendiente** ("no válido como factura"); se reintenta cuando vuelve internet.
2. **ARCA rechaza por datos** (CUIT/condición/punto de venta/tipo) → `cae_error` con la causa visible;
   el usuario **corrige los datos fiscales** y reintenta sobre la misma venta.
3. **Timeout (el caso delicado)** → NO pedir un CAE nuevo a ciegas. Antes de reintentar, **consultar
   a ARCA el último comprobante autorizado** (CUIT + punto de venta + tipo); si coincide con la venta
   pendiente, guardar ese CAE y marcar autorizado; si no, reintentar. Evita CAE duplicado y saltos de numeración.
4. **CAE autorizado pero no imprimió** → fiscal queda `cae_authorized`; acción = **reimprimir** el mismo
   comprobante. NO pedir CAE de nuevo, NO crear venta.

### Reglas de reintento y reimpresión (no negociables)
- Reintentar CAE: opera sobre la misma venta; **no** toca stock ni caja; **no** crea venta; **no** se
  permite si ya hay `cae_authorized`; cada intento se registra; timeout → verificar antes de reintentar.
- Reimprimir: nunca crea venta, nunca mueve stock/caja, nunca pide CAE nuevo. Con CAE → mismo comprobante
  fiscal; sin CAE → ticket interno pendiente. Se registra en `print_logs`/auditoría. Ticket reimpreso lleva
  leyenda "REIMPRESIÓN" + fecha original.
- **Errores reintentables** (internet/timeout/ARCA caído/token vencido) → cola de reintentos.
  **No reintentables sin corregir** (CUIT/punto de venta/tipo/condición/importe) → mostrar qué dato arreglar.

### Modo de emisión (configurable en Ajustes → Facturación)
- **Seguro**: la venta fiscal no se finaliza hasta obtener CAE (estricto; si ARCA/internet falla, frena).
- **Operativo con pendientes** (default práctico): la venta queda `paid`, fiscal `pending_cae`, imprime
  ticket interno, y se reintenta después. No frena el local, pero exige control de pendientes.

### Tablas adicionales (fase Fiscal) — multi-tenant por `businessId`
- **arca_attempts**: `sale_id`, `fiscal_invoice_id`, `attempt_number`, `status`, `request_payload`,
  `response_payload`, `error_code`, `error_message`, `started_at`, `finished_at` (cada intento ARCA).
- **fiscal_retry_queue** (opcional): `sale_id`, `fiscal_invoice_id`, `status` (queued/processing/success/
  failed/cancelled), `retry_after`, `attempts_count`, `last_error`.
- **print_logs** (opcional): `sale_id`, `fiscal_invoice_id`, `printed_by_user_id`, `print_type`
  (internal_ticket/fiscal_invoice/reprint/cash_closure), `status`, `printer_name`, `error_message`.
- `fiscal_invoices` suma: `retry_count`, `last_retry_at`, `authorized_at`.

### Módulo "Facturación" (UI, fase Fiscal)
Secciones: **Comprobantes autorizados** (CAE, número, vencimiento, reimprimir/PDF), **Pendientes de CAE**
(reintentar / ticket interno), **Errores de CAE** (código, mensaje, corregir datos, reintentar),
**Reintentos**, **Configuración ARCA**. En el **detalle de venta**: panel fiscal con estado + CAE +
vencimiento + tipo + punto de venta + número + último error + intentos, y acciones según estado.

### Impacto en el cierre de caja (integra con `cashClosure`)
Si el negocio usa ARCA, la hoja de cierre muestra resumen fiscal: autorizadas / pendientes / con error /
total fiscal autorizado / total interno pendiente. Config: permitir cerrar con pendientes (default, con
**advertencia** y registro) o exigir autorización fiscal completa antes de cerrar.

### Endpoints (fase Fiscal)
`GET /api/fiscal/invoices` (+ `/pending`, `/errors`, `/:id`), `POST /api/fiscal/invoices/:id/retry`,
`GET /api/fiscal/invoices/:id/pdf`, `POST /api/fiscal/invoices/:id/reprint`,
`GET /api/sales/:id/fiscal-status`, `POST /api/sales/:id/retry-cae`,
`POST /api/sales/:id/print-internal-ticket`, `POST /api/sales/:id/reprint`.

## Dependencias

Requiere el dominio **Ventas** construido (`sales`, `fiscal_invoices`) y la integración ARCA.
Orden: Productos → Ventas/POS → Caja → … → **Fiscal/ARCA (incluye este manejo de errores/reintentos)**
→ Conciliación avanzada.
