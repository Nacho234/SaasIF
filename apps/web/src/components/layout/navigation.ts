import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Receipt,
  Package,
  Tags,
  BadgePercent,
  Gift,
  Boxes,
  Users,
  Truck,
  ClipboardList,
  Undo2,
  Banknote,
  BarChart3,
  ShieldCheck,
  History,
  Wrench,
  Settings,
  Bookmark,
  Download,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/types';
import { ROUTES } from '@/constants/routes';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Permiso necesario para ver el ítem (undefined = todos). */
  permission?: Permission;
  end?: boolean;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { label: 'Inicio', to: ROUTES.dashboard, icon: LayoutDashboard, end: true },
      { label: 'Nueva venta', to: ROUTES.pos, icon: ShoppingCart, permission: 'sell' },
      { label: 'Caja', to: ROUTES.cash, icon: Wallet },
      { label: 'Ventas', to: ROUTES.sales, icon: Receipt },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos', to: ROUTES.products, icon: Package },
      { label: 'Categorías', to: ROUTES.categories, icon: Tags, permission: 'edit_products' },
      { label: 'Marcas', to: ROUTES.brands, icon: Bookmark, permission: 'edit_products' },
      { label: 'Combos', to: ROUTES.combos, icon: Gift, permission: 'edit_products' },
      { label: 'Inventario', to: ROUTES.inventory, icon: Boxes, permission: 'adjust_stock' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { label: 'Clientes', to: ROUTES.customers, icon: Users },
      { label: 'Devoluciones', to: ROUTES.returns, icon: Undo2, permission: 'create_return' },
      { label: 'Proveedores', to: ROUTES.suppliers, icon: Truck, permission: 'manage_purchases' },
      { label: 'Compras', to: ROUTES.purchases, icon: ClipboardList, permission: 'manage_purchases' },
      { label: 'Promociones', to: ROUTES.promotions, icon: BadgePercent, permission: 'edit_products' },
      { label: 'Gastos', to: ROUTES.expenses, icon: Banknote, permission: 'register_expenses' },
      { label: 'Reportes', to: ROUTES.reports, icon: BarChart3, permission: 'view_reports' },
      { label: 'Exportaciones', to: ROUTES.exports, icon: Download, permission: 'view_reports' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', to: ROUTES.users, icon: ShieldCheck, permission: 'manage_users' },
      { label: 'Auditoría', to: ROUTES.audit, icon: History, permission: 'view_audit' },
      { label: 'Herramientas', to: ROUTES.tools, icon: Wrench, permission: 'reset_demo' },
      { label: 'Configuración', to: ROUTES.settings, icon: Settings, permission: 'manage_settings' },
    ],
  },
];
