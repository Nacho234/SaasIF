import { useEffect, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useBusinessStore } from '@/store/businessStore';
import { isDemoMode } from '@/config/appMode';
import { seedDemoData } from '@/demo/demoDataService';
import { applyDensity, applyPrimaryColor, applyThemeMode } from '@/utils/theme';
import { ToastHost } from '@/components/ui/ToastHost';
import { ConfirmDialogHost } from '@/components/ui/ConfirmDialogHost';
import { toast } from '@/store/uiStore';

function PwaUpdater() {
  useRegisterSW({
    onOfflineReady() {
      toast.info('App lista para usar offline', 'Mostrador quedó instalada en caché local.');
    },
    onRegisterError() {
      // Silencioso: la demo funciona igual sin service worker.
    },
  });
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const settings = useBusinessStore((s) => s.settings);

  // Siembra los datos demo antes del primer render (solo en modo demo, la primera vez).
  // En modo producción NO se siembran datos falsos: la fuente de verdad es el backend real.
  const [seeded] = useState(() => {
    if (isDemoMode && !useBusinessStore.getState().demoSeeded) seedDemoData();
    return true;
  });

  useEffect(() => {
    applyPrimaryColor(settings.primaryColor);
  }, [settings.primaryColor]);

  useEffect(() => {
    applyThemeMode(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    applyDensity(settings.density);
  }, [settings.density]);

  if (!seeded) return null;

  return (
    <>
      {children}
      <ToastHost />
      <ConfirmDialogHost />
      <PwaUpdater />
    </>
  );
}
