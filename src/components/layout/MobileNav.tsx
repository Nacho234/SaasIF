import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Wallet, Package, Menu, Store, LogOut } from 'lucide-react';
import { NAV_GROUPS } from './navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useUiStore } from '@/store/uiStore';
import { useBusinessStore } from '@/store/businessStore';
import { logout } from '@/services/authService';
import { ROUTES } from '@/constants/routes';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/utils/cn';

const QUICK_ITEMS = [
  { label: 'Inicio', to: ROUTES.dashboard, icon: LayoutDashboard, end: true },
  { label: 'Vender', to: ROUTES.pos, icon: ShoppingCart },
  { label: 'Caja', to: ROUTES.cash, icon: Wallet },
  { label: 'Productos', to: ROUTES.products, icon: Package },
];

/** Bottom navigation + drawer de menú completo para mobile. */
export function MobileNav() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const mobileMenuOpen = useUiStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const businessName = useBusinessStore((s) => s.settings.businessName);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-slate-800 dark:bg-slate-900"
        aria-label="Navegación rápida"
      >
        {QUICK_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400',
              )
            }
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-slate-500 dark:text-slate-400"
        >
          <Menu className="size-5" aria-hidden />
          Menú
        </button>
      </nav>

      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Store className="size-4" />
            </span>
            {businessName}
          </span>
        }
      >
        <nav className="flex flex-col gap-4" aria-label="Menú completo">
          {NAV_GROUPS.map((group, gi) => {
            const items = group.items.filter((item) => !item.permission || can(item.permission));
            if (items.length === 0) return null;
            return (
              <div key={gi}>
                {group.label && (
                  <p className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    {group.label}
                  </p>
                )}
                <ul className="flex flex-col">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                            isActive
                              ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                              : 'text-slate-600 dark:text-slate-300',
                          )
                        }
                      >
                        <item.icon className="size-5" aria-hidden />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
              navigate(ROUTES.login);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400"
          >
            <LogOut className="size-5" aria-hidden />
            Cerrar sesión
          </button>
        </nav>
      </Drawer>
    </>
  );
}
