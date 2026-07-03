import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from './GlobalSearch';
import { useUiStore } from '@/store/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePermissions } from '@/hooks/usePermissions';
import { isProdMode } from '@/config/appMode';
import { loadCatalog } from '@/services/catalogService';
import { loadCustomers } from '@/services/customerService';
import { toast } from '@/store/uiStore';
import { ROUTES } from '@/constants/routes';

export function AppLayout() {
  const setGlobalSearchOpen = useUiStore((s) => s.setGlobalSearchOpen);
  const navigate = useNavigate();
  const { can } = usePermissions();

  useKeyboardShortcuts({
    'ctrl+k': () => setGlobalSearchOpen(true),
    f2: () => can('sell') && navigate(ROUTES.pos),
  });

  // En modo prod, trae catálogo y clientes del backend al entrar (en demo ya está sembrado).
  useEffect(() => {
    if (!isProdMode) return;
    loadCatalog().catch(() => toast.error('No se pudo cargar el catálogo', 'Revisá tu conexión con el servidor.'));
    loadCustomers().catch(() => toast.error('No se pudieron cargar los clientes', 'Revisá tu conexión con el servidor.'));
  }, []);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 pb-24 sm:px-5 sm:py-6 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <GlobalSearch />
    </div>
  );
}
