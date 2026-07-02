import type { ReactNode } from 'react';
import type { Permission } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';

/** Renderiza los hijos solo si el usuario tiene el permiso. */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
