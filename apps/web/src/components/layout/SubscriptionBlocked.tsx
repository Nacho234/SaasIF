import { Lock } from 'lucide-react';
import { logout } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

const STATUS_LABEL: Record<string, string> = {
  past_due: 'con un pago pendiente',
  cancelled: 'cancelada',
  expired: 'vencida',
  blocked: 'bloqueada',
};

/** Pantalla de bloqueo cuando la suscripción no está activa. */
export function SubscriptionBlocked() {
  const status = useAuthStore((s) => s.subscriptionStatus);
  const detail = status ? STATUS_LABEL[status] ?? 'inactiva' : 'inactiva';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950">
          <Lock className="size-7" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tu suscripción está {detail}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Para volver a usar el sistema necesitás una suscripción activa. Renovala desde la página de suscripción y
          después volvé a iniciar sesión.
        </p>
        <Button className="mt-6 w-full" onClick={() => logout()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
