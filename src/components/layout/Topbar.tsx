import { useNavigate } from 'react-router-dom';
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  Wallet,
  WifiOff,
  FlaskConical,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useCashStore, selectOpenRegister } from '@/store/cashStore';
import { useUiStore } from '@/store/uiStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePermissions } from '@/hooks/usePermissions';
import { logout } from '@/services/authService';
import { ROUTES } from '@/constants/routes';
import { ROLE_LABELS } from '@/constants/permissions';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/utils/cn';

export function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const settings = useBusinessStore((s) => s.settings);
  const updateSettings = useBusinessStore((s) => s.updateSettings);
  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
  const openRegister = useCashStore((s) => selectOpenRegister(s));
  const setGlobalSearchOpen = useUiStore((s) => s.setGlobalSearchOpen);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const online = useOnlineStatus();
  const { can } = usePermissions();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-4 dark:border-slate-800 dark:bg-slate-900/90">
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      {/* Búsqueda global */}
      <button
        onClick={() => setGlobalSearchOpen(true)}
        className="flex h-9 flex-1 max-w-md cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 truncate text-left">Buscar productos, clientes, ventas…</span>
        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-400 sm:inline dark:border-slate-600 dark:bg-slate-700">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Estado de caja */}
        <button
          onClick={() => navigate(ROUTES.cash)}
          className={cn(
            'hidden cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors md:flex',
            openRegister
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
          )}
        >
          <Wallet className="size-3.5" aria-hidden />
          {openRegister ? `Caja abierta · ${openRegister.number}` : 'Caja cerrada'}
        </button>

        {/* Modo demo */}
        <Badge variant="warning" className="hidden sm:inline-flex">
          <FlaskConical className="size-3" aria-hidden />
          Demo
        </Badge>

        {/* Offline */}
        {!online && (
          <Badge variant="danger">
            <WifiOff className="size-3" aria-hidden />
            Offline
          </Badge>
        )}

        {/* Nueva venta */}
        {can('sell') && (
          <Button size="sm" onClick={() => navigate(ROUTES.pos)} className="hidden sm:inline-flex">
            <Plus className="size-4" aria-hidden />
            Nueva venta
          </Button>
        )}

        {/* Notificaciones */}
        <button
          onClick={() => navigate(ROUTES.notifications)}
          className="relative cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label={`Notificaciones${unreadCount ? ` (${unreadCount} sin leer)` : ''}`}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Usuario */}
        <Dropdown
          trigger={
            <span className="flex cursor-pointer items-center gap-2 rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar name={user.name} color={user.avatarColor} size="sm" />
              <span className="hidden text-left md:block">
                <span className="block max-w-28 truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {user.name}
                </span>
                <span className="block text-[10px] text-slate-400">{ROLE_LABELS[user.role]}</span>
              </span>
            </span>
          }
          items={[
            {
              label: settings.theme === 'dark' ? 'Modo claro' : 'Modo oscuro',
              icon: settings.theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />,
              onClick: () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }),
            },
            'separator',
            {
              label: 'Cerrar sesión',
              icon: <LogOut className="size-4" />,
              danger: true,
              onClick: () => {
                logout();
                navigate(ROUTES.login);
              },
            },
          ]}
        />
      </div>
    </header>
  );
}
