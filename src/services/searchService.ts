import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useSalesStore } from '@/store/salesStore';
import { useSupplierStore } from '@/store/supplierStore';
import { ROUTES } from '@/constants/routes';
import { formatMoney } from '@/utils/format';

export type SearchResultType = 'product' | 'customer' | 'sale' | 'supplier' | 'module';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const MODULES: { keywords: string; title: string; url: string }[] = [
  { keywords: 'nueva venta pos vender cobrar', title: 'Nueva venta (POS)', url: ROUTES.pos },
  { keywords: 'caja abrir cerrar arqueo', title: 'Caja', url: ROUTES.cash },
  { keywords: 'productos catalogo precios', title: 'Productos', url: ROUTES.products },
  { keywords: 'categorias', title: 'Categorías', url: ROUTES.categories },
  { keywords: 'marcas', title: 'Marcas', url: ROUTES.brands },
  { keywords: 'combos', title: 'Combos', url: ROUTES.combos },
  { keywords: 'stock inventario kardex', title: 'Inventario', url: ROUTES.inventory },
  { keywords: 'clientes deuda cuenta corriente fiado', title: 'Clientes', url: ROUTES.customers },
  { keywords: 'ventas historial comprobantes', title: 'Ventas', url: ROUTES.sales },
  { keywords: 'devoluciones cambios', title: 'Devoluciones', url: ROUTES.returns },
  { keywords: 'proveedores', title: 'Proveedores', url: ROUTES.suppliers },
  { keywords: 'compras ordenes reposicion', title: 'Compras', url: ROUTES.purchases },
  { keywords: 'promociones descuentos ofertas', title: 'Promociones', url: ROUTES.promotions },
  { keywords: 'gastos egresos', title: 'Gastos', url: ROUTES.expenses },
  { keywords: 'reportes estadisticas metricas', title: 'Reportes', url: ROUTES.reports },
  { keywords: 'usuarios permisos roles', title: 'Usuarios', url: ROUTES.users },
  { keywords: 'auditoria actividad registro', title: 'Auditoría', url: ROUTES.audit },
  { keywords: 'notificaciones alertas', title: 'Notificaciones', url: ROUTES.notifications },
  { keywords: 'herramientas demo backup exportar importar', title: 'Herramientas', url: ROUTES.tools },
  { keywords: 'configuracion ajustes negocio ticket', title: 'Configuración', url: ROUTES.settings },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function globalSearch(query: string): SearchResult[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const results: SearchResult[] = [];

  const { products } = useProductStore.getState();
  for (const p of products.filter(
    (p) => normalize(p.name).includes(q) || normalize(p.sku).includes(q) || p.barcode.includes(q),
  ).slice(0, 5)) {
    results.push({
      type: 'product',
      id: p.id,
      title: p.name,
      subtitle: `${p.sku} · ${formatMoney(p.salePrice)} · Stock: ${p.stock}`,
      url: ROUTES.productDetail(p.id),
    });
  }

  const { customers } = useCustomerStore.getState();
  for (const c of customers
    .filter((c) => normalize(c.name).includes(q) || c.phone.includes(q) || normalize(c.email).includes(q) || c.document.includes(q))
    .slice(0, 4)) {
    results.push({
      type: 'customer',
      id: c.id,
      title: c.name,
      subtitle: c.debtBalance > 0 ? `Debe ${formatMoney(c.debtBalance)}` : (c.phone || c.email || 'Cliente'),
      url: ROUTES.customerDetail(c.id),
    });
  }

  const { sales } = useSalesStore.getState();
  for (const s of sales.filter((s) => normalize(s.saleNumber).includes(q)).slice(0, 4)) {
    results.push({
      type: 'sale',
      id: s.id,
      title: `Venta ${s.saleNumber}`,
      subtitle: `${formatMoney(s.total)} · ${s.customerName ?? 'Consumidor final'}`,
      url: ROUTES.saleDetail(s.id),
    });
  }

  const { suppliers } = useSupplierStore.getState();
  for (const sup of suppliers.filter((s) => normalize(s.name).includes(q)).slice(0, 3)) {
    results.push({
      type: 'supplier',
      id: sup.id,
      title: sup.name,
      subtitle: sup.contactName || 'Proveedor',
      url: ROUTES.supplierDetail(sup.id),
    });
  }

  for (const m of MODULES.filter((m) => normalize(m.keywords).includes(q) || normalize(m.title).includes(q)).slice(0, 4)) {
    results.push({ type: 'module', id: m.url, title: m.title, subtitle: 'Ir al módulo', url: m.url });
  }

  return results.slice(0, 14);
}
