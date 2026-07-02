import { useNavigate } from 'react-router-dom';
import { Home, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/constants/permissions';

export function NoPermissionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in">
      <span className="mb-4 rounded-2xl bg-amber-100 p-5 text-amber-500 dark:bg-amber-950">
        <ShieldAlert className="size-10" aria-hidden />
      </span>
      <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">No tenés permisos para ver esta sección</h1>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Tu usuario {user ? `(${ROLE_LABELS[user.role]})` : ''} no tiene acceso a este módulo. Si lo necesitás,
        pedile a un administrador que te lo habilite desde <strong>Usuarios y permisos</strong>.
      </p>
      <p className="mt-2 text-xs text-slate-400">El intento quedó registrado en la auditoría del sistema.</p>
      <Button className="mt-6" onClick={() => navigate(ROUTES.dashboard)}>
        <Home className="size-4" aria-hidden />
        Volver al inicio
      </Button>
    </div>
  );
}
