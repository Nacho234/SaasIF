# Spec — Caja: arqueo, cierre diario, terminales y reapertura (BACKEND)

> **Estado**: spec del **backend de Caja**. El **frontend demo ya existe** (lo hizo Nico: wizard de
> cierre, arqueo, cierre de terminales, hoja de cierre, config en Ajustes → "Cierre de caja"). Falta el
> **backend real** (persistencia, transacciones, aislamiento). Es el **build #1 del core** (previo a Ventas;
> algunos totales por método dependen de Ventas, así que Caja y Ventas se construyen encadenados).
> Regla transversal: todo filtra por `businessId` y por `branchId` cuando corresponde; todo cierre se audita
> y queda consultable.

## Reglas de integridad (no negociables)

- No editar cierres confirmados sin una **acción administrativa auditada**; no borrar cierres; no recalcular
  cierres históricos sin dejar registro.
- **En caja cerrada**: no se permiten ventas nuevas ni movimientos manuales.
- **Reapertura**: solo con permiso + **motivo obligatorio** + auditoría; conserva el cierre anterior.
- Cerrar con diferencia exige **observación** si la config lo pide.
- **No confundir** diferencia de efectivo con diferencia de terminal; ni total de ventas con efectivo esperado.
- **No mezclar** caja (efectivo), terminales (electrónico) y facturación fiscal en una sola entidad — son 3 planos.

## `close-preview` (resumen previo, NO cierra)

`POST /api/cash-registers/:id/close-preview` → calcula un resumen **sin cerrar** (no mueve dinero, no crea
cierre). Devuelve: datos de caja, apertura (fecha/usuario), ventas del período (cantidad + total), **total por
método** (efectivo, transferencia, débito, crédito, QR, cuenta corriente, mixto), gastos, retiros, devoluciones,
anulaciones, monto inicial, **efectivo esperado**, movimientos manuales, resumen fiscal (si aplica), resumen de
stock (si aplica), advertencias y validaciones pendientes. Sirve para revisar antes de confirmar.

## Efectivo esperado y diferencia

```
efectivo_esperado = monto_inicial + ventas_en_efectivo + ingresos_manuales
                    − egresos_manuales − gastos − retiros − devoluciones_en_efectivo
                    − anulaciones_en_efectivo (si corresponde)
diferencia = efectivo_contado − efectivo_esperado
```
Ej: 20.000 + 130.000 + 5.000 − 10.000 − 0 − 2.000 = **143.000** esperado; contado 140.000 → diferencia **−3.000**.
Si `diferencia ≠ 0` y `require_difference_note = true` → observación obligatoria.

## `close` (cierre definitivo, transaccional)

`POST /api/cash-registers/:id/close`. **Valida**: caja existe / es del `businessId` / sucursal correcta / está
abierta / usuario con permiso / arqueo enviado / observación si hay diferencia (cuando corresponde) / cierres de
terminal cargados si `require_terminal_closure` / resumen fiscal calculado si `show_fiscal_summary` / config de
comprobantes pendientes aplicada / **no hay otra operación cerrando la misma caja** (lock).

**Al confirmar (todo en una transacción)**: guarda `counted_cash_amount`, `expected_cash_amount`,
`cash_difference`, `close_notes`, `closed_by_user_id`, `closed_at`; status → `closed` o
`closed_with_difference`; crea `cash_closure`; asocia `terminal_closures`; genera hoja de cierre; genera PDF si
`auto_generate_pdf`; audita; **bloquea ventas nuevas** en esa caja. Si falla algo crítico → **rollback total**
(no dejar caja a medio cerrar, no bloquear ventas por error), mensaje claro + log técnico interno.

## Cierre con diferencia

`status = closed_with_difference`. Hoja destaca la diferencia: `> 0` "Sobra efectivo", `< 0` "Falta efectivo".
Observación obligatoria si la config lo exige. Audita `cash.closed_with_difference` + notificación `warning`
("La caja cerró con una diferencia de −$X. Revisar observación").

## Cierre de terminales (conciliación electrónica, separado del arqueo)

Concilia pagos electrónicos: compara **total sistema vs total informado por la terminal/procesador**. **No**
modifica ventas, ni efectivo, ni fiscal. Cada `terminal_closure`: procesador, terminal, lote, número de cierre,
totales sistema/terminal/diferencia **por débito, crédito y QR** + total, y observación. **Varios por caja**
(ej. Payway Caja 1, MP Point, Getnet Mostrador). Observación obligatoria si hay diferencia y la config lo exige.

## Hoja de cierre (imprimible, diseño de reporte)

"Hoja de Cierre Diario": **encabezado** (negocio, sucursal, caja, N° cierre, apertura/cierre + usuarios, estado),
**resumen de ventas** (cantidad, total, anulaciones, devoluciones, tickets internos, fiscal si aplica), **por
método de pago**, **arqueo** (inicial, ventas efectivo, ingresos, egresos, gastos, retiros, devoluciones,
esperado, contado, diferencia), **terminales** (sistema/terminal/diferencia + obs.), **fiscal** (autorizadas /
pendientes / errores / NC / total fiscal / total interno pendiente, si aplica), **stock** (unidades/productos
vendidos, ajustes, devoluciones con reposición, si aplica), **auditoría resumida** (anuladas, devoluciones,
gastos, retiros, movimientos manuales, usuarios) y **firmas** (empleado/encargado + obs., si aplica).

## PDF

`GET /api/cash-registers/:id/closure/pdf`. Usa **datos guardados** del cierre (no recalcular a ciegas; si se
regenera, dejarlo claro); no permite modificar datos históricos; guarda `pdf_url` si hay almacenamiento;
descargable desde el historial; diseño profesional A4. Genera al cerrar si `auto_generate_pdf`, o bajo demanda.

## Historial de cierres

`Caja → Historial de cierres`. Filtros: fecha desde/hasta, sucursal, caja, usuario apertura/cierre, estado,
con/sin diferencia. Columnas: aperturas/cierres, sucursal, caja, usuarios, monto inicial, total ventas, efectivo,
tarjetas, QR, diferencia, estado, acciones (ver detalle, imprimir, PDF, ver movimientos, terminales, auditoría).

## Reapertura

`POST /api/cash-registers/:id/reopen`. Solo admin/permiso + habilitado en config + **motivo obligatorio** +
auditoría. Conserva el cierre original (no borra `cash_closure`, PDF ni auditoría); status → `reopened`; al volver
a cerrar genera **nueva versión** de cierre. Tabla `cash_reopen_logs` (`cash_register_id`, `reopened_by_user_id`,
`reason`, `previous_closure_id`, `reopened_at`). UI muestra aviso: "Esta caja fue reabierta por un administrador…".

## Permisos

`open_cash`, `close_cash`, `view_cash`, `manage_cash_movements`, `reopen_cash`, `view_cash_closures`,
`download_cash_closure_pdf`, `manage_cash_close_settings`, `manage_terminal_closures`, `close_cash_with_difference`,
`close_cash_without_terminal_closure`, `close_cash_with_fiscal_pending`. (Cajero: abrir/vender/cerrar/arqueo si
tiene permiso, **no** reabrir. Encargado: cerrar, ver diferencias, cargar terminales, historial. Admin/Dueño:
configurar, reabrir, reportes, auditoría. Contador: ver cierres, PDFs, exportar.)

## Notificaciones

Caja abierta / cerrada / cerrada con diferencia / reabierta; cierre de terminal con diferencia; cierre fiscal con
pendientes; intento de cierre bloqueado; PDF generado; error al generar PDF.

## Auditoría (taxonomía)

`cash.{opened,closed,closed_with_difference,reopened,close_blocked}`, `cash.movement.created`,
`cash.expense.created`, `cash.withdrawal.created`, `terminal.closure.{created,difference_detected}`,
`cash.settings.updated`, `cash.closure.{pdf_generated,printed,downloaded}`. Cada log:
`business_id, branch_id, user_id, cash_register_id, cash_closure_id?, action, module, description, metadata, created_at`.

## UX / mensajes humanos (no técnicos)

"No se pudo cerrar la caja. Revisá los datos e intentá nuevamente." · "No tenés permiso para cerrar esta caja." ·
"Esta caja ya fue cerrada. Podés verla desde el historial de cierres." · "Para cerrar caja primero tenés que
cargar el cierre de terminales." Estados visuales: abierta / cerrada / cerrada con diferencia / reabierta / cierre
en proceso / PDF generado o pendiente / terminales verificadas o con diferencia. Botones críticos con loading +
bloqueo anti-doble-click (y backend idempotente).

## Tablas (backend) — multi-tenant por `businessId` (+ `branchId`)

- **cash_registers** (ampliar): status (`open`/`closed`/`closed_with_difference`/`reopened`), monto inicial,
  aperturas/cierres (fecha+usuario), `counted_cash_amount`, `expected_cash_amount`, `cash_difference`, `close_notes`.
- **cash_closures**: snapshot del cierre (totales por método, arqueo, resumen fiscal/stock, número de cierre,
  versión, `previous_closure_id` si es reapertura, `pdf_url`).
- **terminal_closures**: por procesador/terminal (lote, número, totales sistema/terminal/diferencia por medio, obs).
- **cash_reopen_logs**: motivo + usuario + `previous_closure_id`.
- **cash_close_settings** (o dentro de business_settings): `require_cash_count`, `require_difference_note`,
  `allow_close_with_difference`, `require_terminal_closure`, `terminal_closure_mode` (simple/advanced),
  firmas, `allow_reopen_cash`, `reopen_only_admin`, `auto_generate_pdf`, `show_fiscal_summary`, `show_stock_summary`.
  (Estas ya existen en el frontend de Nico.)

## Criterios de aceptación (resumen)

No cerrar sin arqueo / sin caja abierta / una ya cerrada; diferencia pide observación cuando corresponde; calcula
esperado y diferencia; terminales como opción avanzada (no exigidas por defecto; si se exigen, bloquean hasta
cargarlas); hoja final imprimible + PDF; historial; caja cerrada bloquea ventas; reapertura solo con permiso +
motivo, conservando el cierre anterior; PDF usa datos guardados; todo por `businessId`/`branchId` y auditado; el
sistema **diferencia arqueo, terminales y fiscal**; el POS actual no se rompe.

## Dependencias

Apertura/movimientos/arqueo se pueden construir con lo que hay; los **totales por método** y el resumen de ventas
del cierre dependen del dominio **Ventas** (`sales`, `sale_payments`). Por eso Caja y Ventas se construyen
encadenados. El resumen **fiscal** del cierre depende de `arca-fiscal.md` (fase posterior).
