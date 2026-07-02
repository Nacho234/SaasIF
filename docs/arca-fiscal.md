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

## Dependencias

Requiere el dominio **Ventas** construido (`sales` para `sale_id`). Orden: Productos → Ventas/POS →
Caja → … → **Fiscal/ARCA** → Conciliación avanzada.
