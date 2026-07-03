# Spec — Contracargos, disputas, pagos revertidos y notas de crédito

> **Estado**: spec congelada para la **última fase** del roadmap. NO se implementa todavía.
> Depende de TODO lo anterior: Ventas transaccionales + Pagos + Caja + ARCA + errores de CAE.
> Complementa [`pagos-avanzados.md`](./pagos-avanzados.md) (medios de pago/procesadores) y
> [`arca-fiscal.md`](./arca-fiscal.md) (facturas fiscales / notas de crédito).

## El problema

Una venta se paga con tarjeta y el pago se aprueba. El producto puede haberse entregado y la factura
emitido con CAE. **Días después** el procesador informa **contracargo / fraude / tarjeta robada /
desconocimiento / reversión** y retira el dinero al comercio. Hay que manejarlo **sin borrar la venta,
sin romper la caja, sin duplicar comprobantes, con trazabilidad completa**.

## Decisión central

**Un contracargo o pago revertido NO elimina la venta original.** Reglas de oro:

- **No** borrar la venta ni la factura; **no** editar la factura original.
- **No** modificar silenciosamente un cierre de caja ya cerrado.
- **No** devolver stock automáticamente sin validar entrega.
- **Sí** registrar la disputa/contracargo + el ajuste financiero + (si corresponde) la nota de crédito.
- **Sí** dejar auditoría completa. Nunca ocultar el problema.

## Separar 5 conceptos (estados independientes)

Venta ≠ Pago ≠ Factura fiscal ≠ Entrega ≠ Disputa. Un mismo caso puede ser: venta *realizada*, pago
*revertido*, factura *emitida con CAE*, stock *entregado*, disputa *perdida*. Por eso no se resuelve borrando.

- **`sale_payments.status`**: `pending | approved | rejected | refunded | partially_refunded |
  chargeback_pending | chargeback_lost | chargeback_won | reversed | fraud_alert`.
- **`sales.status`**: `draft | paid | cancelled | returned | disputed | payment_reversed | cancelled_due_to_fraud`.
- **`fiscal_status`** (suma a los de arca-fiscal.md): `credit_note_pending | credit_note_authorized |
  debit_note_pending | debit_note_authorized | fiscal_adjustment_required`.
- **`delivery_status`** (opcional pero recomendado): `not_delivered | reserved | delivered |
  partially_returned | returned`.

## Los 4 casos

1. **Alerta de fraude ANTES de entregar** → pago `fraud_alert`/`chargeback_pending`, bloquear entrega,
   cancelar si corresponde. Si se descontó stock → liberar/devolver. Si había factura → nota de crédito.
   Final: venta `cancelled_due_to_fraud`, stock restaurado, NC si había factura.
2. **Contracargo DESPUÉS de entregar** → `chargeback_pending`; si se pierde → `chargeback_lost`/`reversed`,
   **ajuste financiero negativo**, **NO** devolver stock (registrar pérdida), NC si había factura.
   Final: venta `payment_reversed`/`disputed`, `credit_note_pending`.
3. **Contracargo GANADO** (el comercio prueba la operación) → pago `chargeback_won`, venta sigue `paid`,
   **NO** se emite nota de crédito, **NO** se toca stock ni factura. Solo auditoría.
4. **Devolución real del producto** → registrar devolución, devolver stock si volvió sano, NC si había
   factura, ajuste financiero si el pago fue revertido. Final: venta `returned`.

## Stock ante contracargos (no automático)

- Producto **no entregado** → liberar reserva / devolver stock.
- Producto **entregado** → NO devolver stock automático; registrar **pérdida por contracargo**.
- Producto **recuperado** → devolución manual / flujo de devolución, con condición: `sellable | damaged | lost`.

## Caja y cierre diario

Si el contracargo ocurre días después, **NO editar el cierre original**. Registrar un **ajuste financiero
en la fecha del contracargo**, relacionado con la venta original, visible en reportes y auditoría. Ej:
`type: chargeback_adjustment, amount: -35000, sale: #000154, fecha: 08/07/2026`. En el cierre del día del
contracargo aparece "Ajustes por contracargos".

## Fiscal / notas de crédito

- Venta **sin** factura fiscal → solo ajuste interno, no hay NC fiscal.
- Venta **con** factura + CAE → **crear nota de crédito** total o parcial (nunca borrar/editar la original).
  La NC **se relaciona con la factura original**. Estados NC: `draft | pending_cae | authorized | cae_error |
  cancelled`. Acciones: emitir total/parcial, ver, reintentar CAE, reimprimir.
- **Nota de crédito** (reduce/anula factura) vs **nota de débito** (agrega importe). Contracargo/reversión
  → normalmente **crédito**. **Validar reglas fiscales con contador antes de producción.**

## Webhooks de procesadores (MP / Payway / viüMi)

Flujo: validar autenticidad → **idempotencia** (no procesar 2 veces) → ubicar `payment_id` → `sale_payment`/
`sale` → cambiar estado → crear `payment_disputes` → auditoría → notificar → marcar `fiscal_adjustment_required`
si aplica. **Un webhook duplicado no puede duplicar ajustes/notas/movimientos.** También carga **manual**
(el dueño ve el desconocimiento en el panel del procesador y lo registra).

## Tablas (última fase) — multi-tenant por `businessId`

- **payment_disputes**: `sale_id`, `sale_payment_id`, `processor_id`, `external_dispute_id`, `type`
  (chargeback/fraud_alert/payment_reversal/unknown_payment/refund_dispute), `status` (pending/under_review/
  won/lost/cancelled/resolved), `amount`, `reason`, `processor_reason`, `opened_at`, `resolved_at`,
  `due_date`, `product_delivered`, `product_recovered`, `stock_restocked`, `fiscal_adjustment_required`,
  `credit_note_id`, `notes`.
- **payment_dispute_events**: `dispute_id`, `event_type`, `old_status`, `new_status`, `description`,
  `metadata`, `created_by_user_id` (timeline de la disputa).
- **financial_adjustments**: `sale_id`, `sale_payment_id`, `dispute_id`, `cash_register_id`, `type`
  (chargeback_loss/chargeback_reversal/refund/manual_adjustment/processor_fee_adjustment), `amount`,
  `reason`, `adjustment_date`, `created_by_user_id`.
- **credit_notes**: `sale_id`, `original_fiscal_invoice_id`, `fiscal_invoice_id`, `reason`, `amount`,
  `status`, `created_by_user_id`.
- **dispute_evidence** (opcional): `dispute_id`, `file_url`, `file_name`, `file_type`, `uploaded_by_user_id`.

## Backend

Servicios: `paymentDisputeService`, `chargebackService`, `financialAdjustmentService`, `creditNoteService`,
`disputeEvidenceService`, `paymentWebhookService`, `auditService`, `notificationService`.
Endpoints: `GET/POST /api/payment-disputes`, `GET /api/payment-disputes/:id`,
`POST /api/payment-disputes/:id/{mark-won,mark-lost,evidence,create-credit-note}`,
`POST /api/sales/:id/{register-chargeback,create-credit-note}`, `GET /api/financial-adjustments`,
`POST /api/webhooks/payments`.

## Frontend

Módulo **Ventas → Disputas y contracargos** (o Pagos → Contracargos): tabla con venta/cliente/medio/
procesador/importe/estados(pago,disputa,entrega,fiscal)/fecha/motivo/acciones. Páginas: `PaymentDisputesPage`,
`PaymentDisputeDetailPage`, `SaleChargebackPanel`, `CreditNoteFlowPage`. Componentes: `DisputeStatusBadge`,
`ChargebackAlert`, `RegisterChargebackModal`, `DisputeEvidenceUploader`, `CreateCreditNoteButton`,
`FinancialAdjustmentSummary`, `SalePaymentStatusTimeline`. En el detalle de venta: **panel de pagos y disputas**.
Reportes futuros: contracargos por fecha/procesador, ganados/perdidos, pérdidas, ventas con pago revertido,
NC por contracargo, productos perdidos.

## Auditoría (obligatoria)

Contracargo recibido, alerta de fraude, pago revertido, disputa creada/ganada/perdida, evidencia adjuntada,
ajuste financiero, nota de crédito emitida, stock devuelto, cambio manual de estado. Cada evento guarda
`business_id, branch_id, user_id, sale_id, sale_payment_id, dispute_id, action, description, metadata, created_at`.

## Reglas críticas (no negociables)

1. No borrar venta ni factura originales. 2. No modificar cierres anteriores sin trazabilidad.
3. No devolver stock automático si el producto fue entregado. 4. Webhooks idempotentes; un contracargo no
duplica movimientos. 5. Disputa **ganada** → sin nota de crédito. 6. Disputa **perdida** → ajuste financiero.
7. NC se relaciona con la factura original. 8. El ajuste aparece en la fecha del contracargo. 9. Todo auditado.
10. **Validar reglas fiscales con contador antes de producción.**

## Dependencias / roadmap

Es lo **último**. Orden: Ventas/Pagos/Caja/Stock → ARCA base → errores de CAE y reimpresión →
**contracargos, disputas y notas de crédito**. No implementar antes de tener ventas y pagos reales.
