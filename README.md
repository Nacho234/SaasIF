# Mostrador — PWA de punto de venta y gestión para comercios

Demo profesional de un sistema de ventas interno para locales físicos (petshop, kiosco, farmacia, ferretería, etc.).
**Todo funciona con datos locales**: sin backend, sin base de datos externa, sin APIs reales. Mercado Pago, AFIP,
impresoras, email y WhatsApp están **simulados**.

## Correr el proyecto

```bash
npm install
npm run dev        # desarrollo → http://localhost:5173
npm run build      # build de producción + PWA (dist/)
npm run preview    # servir el build
npm run smoke      # smoke test de la lógica de negocio (requiere Node 22+)
```

## Usuarios demo

En el login hay botones de acceso rápido (sin contraseña):

| Rol | Usuario | Qué ve |
|---|---|---|
| Administrador | Ana García | Todo: reportes, usuarios, auditoría, configuración, herramientas |
| Encargado | Martín López | Ventas, caja, stock, compras, gastos, reportes |
| Vendedor | Camila Fernández | POS simplificado, clientes, consulta de productos |

## Qué incluye

- **POS**: buscador grande, categorías rápidas, favoritos, combos, carrito, cliente rápido,
  descuentos con tope configurable, pago simple/mixto, efectivo con vuelto, QR de Mercado Pago simulado,
  cuenta corriente, atajos (F2 buscar, F4 cobrar, Ctrl+K búsqueda global).
- **Caja**: apertura con monto inicial, movimientos (ingresos/egresos/retiros/correcciones),
  cierre con arqueo, diferencias con observación obligatoria, historial y detalle por turno.
- **Regla crítica**: con la caja cerrada no se puede vender (configurable).
- **Productos**: CRUD completo, categorías, marcas, combos, SKU único, márgenes, favoritos, duplicar, activar/desactivar.
- **Inventario**: kardex por producto, ajustes manuales con motivo, alertas de bajo/sin stock, valor del inventario.
- **Clientes**: ficha completa, historial, cuenta corriente (fiado) con pagos parciales que impactan en caja.
- **Ventas**: historial con filtros, detalle, anulación con motivo (repone stock y ajusta caja), reimpresión.
- **Devoluciones**: flujo completo (buscar venta → elegir ítems → motivo → método → confirmación), restock opcional.
- **Proveedores y compras**: órdenes borrador/enviada/recibida/cancelada; al recibir suma stock y actualiza costos.
- **Promociones**: %, monto fijo, 2x1, por categoría/producto, con vigencia; aplicables desde el POS.
- **Gastos**: por categoría, asociables a la caja abierta, anulables con corrección de caja.
- **Reportes**: evolución de ventas, por método/vendedor/categoría/producto, gastos, deudores, cierres con diferencia.
- **Usuarios y permisos**: 3 roles con permisos personalizables por usuario; los módulos y botones se ocultan sin permiso.
- **Auditoría**: registro de todos los eventos (login, ventas, caja, stock, config, accesos bloqueados).
- **Notificaciones**: centro con alertas de stock, caja, deudas y promos por vencer.
- **Herramientas**: estado de datos locales, export/import simulados, **backup/restore JSON real**, reset de demo.
- **PWA**: instalable, service worker, funciona offline, indicador online/offline.
- **Configurable**: nombre, logo, rubro, color principal, modo claro/oscuro, densidad, métodos de pago, reglas de venta.

## Arquitectura

```
src/
  app/          Router, providers (theme + seed + PWA)
  components/   ui/ (librería propia), layout/, pos/, cash/, inventory/, charts/
  pages/        Una carpeta por módulo
  store/        Zustand + persist (localStorage) por dominio
  services/     Lógica de negocio (ventas, caja, devoluciones, reportes, demo)
  mocks/        Datos base del petshop demo
  types/        Tipos TypeScript por dominio
  utils/        Formato, cálculos, theming, ids
  constants/    Rutas, permisos, métodos de pago, labels
```

La capa de **services** orquesta los stores y es el punto pensado para reemplazar por una API real más adelante
(los componentes nunca tocan la persistencia directamente).

Los datos demo se generan determinísticamente (14 días de ventas, cajas cerradas, un cierre con diferencia,
deudas, compras, promociones) y se pueden resetear desde Herramientas.
