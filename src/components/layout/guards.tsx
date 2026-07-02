import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Permission } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { usePermissions } from '@/hooks/usePermissions';
import { logBlockedAccess } from '@/services/auditService';
import { ROUTES } from '@/constants/routes';

/** Redirige a login si no hay sesión, y a onboarding si aún no se configuró. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const onboardingCompleted = useBusinessStore((s) => s.onboardingCompleted);
  const location = useLocation();

  if (!user) return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  if (!onboardingCompleted && location.pathname !== ROUTES.onboarding) {
    return <Navigate to={ROUTES.onboarding} replace />;
  }
  return <>{children}</>;
}

/** Bloquea la ruta si falta el permiso y registra el intento en auditoría. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can, user } = usePermissions();
  const location = useLocation();
  const allowed = can(permission);

  useEffect(() => {
    if (user && !allowed) logBlockedAccess(location.pathname);
  }, [user, allowed, location.pathname]);

  if (!allowed) return <Navigate to={ROUTES.noPermission} replace />;
  return <>{children}</>;
}
