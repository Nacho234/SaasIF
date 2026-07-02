import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Store } from 'lucide-react';
import { NAV_GROUPS } from './navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useBusinessStore } from '@/store/businessStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

export function Sidebar() {
  const { can } = usePermissions();
  const businessName = useBusinessStore((s) => s.settings.businessName);
  const category = useBusinessStore((s) => s.settings.category);
  const logo = useBusinessStore((s) => s.settings.logo);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex',
        'dark:border-slate-800 dark:bg-slate-900',
        collapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 py-4', collapsed && 'justify-center px-2')}>
        {logo ? (
          <img src={logo} alt="" className="size-9 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Store className="size-5" />
          </span>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-slate-900 dark:text-slate-50">
              {businessName}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{category}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Navegación principal">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter((item) => !item.permission || can(item.permission));
          if (items.length === 0) return null;
          return (
            <div key={gi} className="mt-1">
              {group.label && !collapsed && (
                <p className="px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && <div className="mx-2 my-3 h-px bg-slate-100 dark:bg-slate-800" />}
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          collapsed && 'justify-center px-2',
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                        )
                      }
                    >
                      <item.icon className="size-[18px] shrink-0" aria-hidden />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <button
          onClick={toggleSidebar}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && 'Colapsar menú'}
        </button>
      </div>
    </aside>
  );
}
