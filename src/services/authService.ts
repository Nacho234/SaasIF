import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { logAudit } from './auditService';

export function login(userId: string): { ok: boolean; error?: string } {
  const { users, updateUser } = useUserStore.getState();
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: 'Usuario no encontrado.' };
  if (user.status !== 'active') return { ok: false, error: 'El usuario está desactivado.' };

  const now = new Date().toISOString();
  updateUser(user.id, { lastLoginAt: now });
  useAuthStore.getState().setUser({ ...user, lastLoginAt: now });
  logAudit({
    action: 'login',
    module: 'auth',
    description: `${user.name} inició sesión`,
    severity: 'success',
  });
  return { ok: true };
}

export function logout(): void {
  const user = useAuthStore.getState().user;
  if (user) {
    logAudit({ action: 'logout', module: 'auth', description: `${user.name} cerró sesión` });
  }
  useAuthStore.getState().setUser(null);
}
