# Spec — Configuración avanzada de métodos de pago

> **Estado**: spec congelada para la **fase de Pagos**. NO se implementa todavía porque depende
> del dominio de **Ventas/POS** (`sale_payments`, impacto en el POS), que aún no existe en el backend.
> Se construye después de Ventas, siguiendo el orden del estándar de producción.

## Decisión central (no negociable)

**POS simple por defecto; avanzado opt-in.** El vendedor nunca ve campos que el negocio no activó.
No se obliga a cargar LaPos/viüMi/terminal/lote/banco/tarjeta para vender.

- **Modo simple** (default): el vendedor solo elige método (efectivo, transferencia, débito, crédito,
  QR, Mercado Pago, cuenta corriente, pago mixto). Nada más.
- **Modo avanzado** (se activa en Ajustes): el POS muestra **solo** los campos que el admin activó,
  para conciliación / comisiones / acreditaciones / control por terminal.

Todos los campos avanzados son **opcionales por defecto**; solo se vuelven obligatorios si el
negocio lo configura (`require_*`). Banco emisor, terminal, lote, autorización, operación: opcionales.

## Ubicación

`Ajustes → Métodos de pago` (con subsecciones: Configuración, Procesadores, Terminales, Marcas,
Bancos emisores). Alternativa de nombre: "Pagos y conciliación".

## Schema (Prisma) — todo multi-tenant por `businessId`

- **payment_settings** (1 por negocio): `mode` (simple|advanced), flags `enable_*` por método,
  flags `require_processor | require_terminal | require_card_brand | require_issuer_bank |
  require_operation_number | require_batch_number | require_authorization_code |
  require_installments_for_credit`, `calculate_fees`, `calculate_settlement_date`.
- **payment_processors**: `name`, `type`, `debit_fee_percentage`, `credit_fee_percentage`,
  `qr_fee_percentage`, `fixed_fee`, `debit_settlement_days`, `credit_settlement_days`,
  `qr_settlement_days`, `is_active`. (Payway/LaPos, Fiserv, viüMi, MP Point, Getnet, Otro)
- **payment_terminals**: `name`, `terminal_number`, `processor_id`, `branch_id`, `is_active`, `notes`.
- **card_brands** (catálogo, puede ser global): `name`, `type` (debit|credit|both), `is_active`.
  (Visa, Mastercard, Cabal, Maestro, Naranja, Amex, Otra)
- **issuer_banks**: `name`, `is_active`. (Macro, Galicia, Nación, Santander, BBVA, Provincia,
  Brubank, Ualá, Naranja X, Otro) — **opcional, nunca obligatorio por defecto.**
- **sale_payments** (⚠️ depende del dominio Ventas): `sale_id`, `method`, `amount`, y opcionales
  `processor_id`, `terminal_id`, `card_brand_id`, `issuer_bank_id`, `installments`,
  `operation_number`, `batch_number`, `authorization_code`, más `gross_amount`, `fee_amount`,
  `net_amount`, `settlement_date`.

## Endpoints (fase Pagos)

`GET/PUT /api/payment-settings` · CRUD `/api/payment-processors` · CRUD `/api/payment-terminals` ·
`GET /api/card-brands` · CRUD `/api/issuer-banks`. Todos protegidos por auth + tenant + permiso
`manage_settings`, filtrando por `businessId` del token.

## Impacto en el POS (fase Ventas ya construida)

`PaymentPanel` lee `payment_settings`. Si `mode = advanced`, renderiza `AdvancedPaymentFields`
mostrando **solo los campos activados**, y valida como obligatorios **solo** los `require_* = true`.
Compatible con **pago mixto**: cada pago del mix puede llevar sus propios datos avanzados.

## Comisiones / acreditaciones (MVP avanzado, después)

Con `calculate_fees`/`calculate_settlement_date`, al registrar el pago el sistema estima
`gross_amount`, `fee_amount`, `net_amount` y `settlement_date` según el procesador y método.

## Alcance por MVP

- **MVP inicial** (cuando lleguemos a Pagos): métodos simples + selector simple/avanzado +
  procesadores + terminales/marca/banco/operación **opcionales** + pago mixto compatible.
- **MVP avanzado (futuro)**: comisiones automáticas, fechas de acreditación, liquidaciones,
  conciliación manual, promos por banco, control por terminal, importación de liquidaciones.

## Reportes futuros (dejar preparado)

Ventas por método/procesador/terminal/marca/banco; comisiones estimadas; neto estimado;
acreditaciones pendientes/por fecha; conciliación manual.

## Dependencias

Requiere: dominio **Ventas/POS** en el backend (`sales`, `sale_items`) y el **frontend cableado**
al backend. Orden: Productos → Ventas/POS → Caja → … → **Pagos avanzados** → Conciliación.
