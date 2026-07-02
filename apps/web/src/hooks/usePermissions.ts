import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { Permission } from '@/types';

/**
 * Permisos efectivos del usuario actual. Combina los permisos del usuario
 * con la configuración del negocio (ej: vendedor puede abrir caja solo si
 * la configuración lo habilita).
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const settings = useBusinessStore((s) => s.settings);

  const can = (permission: Permission): boolean => {
    if (!user) return false;
    // El administrador tiene control total (equivale a ALL_PERMISSIONS);
    // esto cubre además permisos agregados en versiones posteriores.
    if (user.role === 'admin') return true;
    if (user.role === 'seller') {
      if (permission === 'open_cash') return settings.allowSellerOpenCash || user.permissions.includes('open_cash');
      if (permission === 'close_cash') return settings.allowSellerCloseCash || user.permissions.includes('close_cash');
    }
    return user.permissions.includes(permission);
  };

  return { user, can, role: user?.role ?? null };
}
