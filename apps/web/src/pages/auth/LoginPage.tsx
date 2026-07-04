import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, FlaskConical, LogIn, Store, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useBusinessStore } from '@/store/businessStore';
import { login } from '@/services/authService';
import { type Session } from '@/services/api/authApiService';
import { loginSupabase } from '@/services/supabase/supabaseAuthService';
import { toast } from '@/store/uiStore';
import { isDemoMode } from '@/config/appMode';
import { ROUTES } from '@/constants/routes';
import { ROLE_LABELS } from '@/constants/permissions';
import { APP_NAME, APP_TAGLINE } from '@/constants/demo';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const online = useOnlineStatus();

  if (user) return <Navigate to={ROUTES.dashboard} replace />;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary-50 via-slate-50 to-slate-100 px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-pop">
            <Store className="size-7" />
          </span>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{APP_TAGLINE}</p>
          <div className="mt-3 flex items-center gap-2">
            {isDemoMode && (
              <Badge variant="warning">
                <FlaskConical className="size-3" aria-hidden />
                Modo demo — datos locales de demostración
              </Badge>
            )}
            {!online && (
              <Badge variant="danger">
                <WifiOff className="size-3" aria-hidden />
                Offline
              </Badge>
            )}
          </div>
        </div>

        {isDemoMode ? <DemoLoginCard /> : <RealAuthCard />}

        <p className="mt-6 text-center text-xs text-slate-400">
          {APP_NAME} © 2026 · PWA instalable
        </p>
      </div>
    </div>
  );
}

/** Modo demo: selector de usuarios sin contraseña (datos locales). */
function DemoLoginCard() {
  const allUsers = useUserStore((s) => s.users);
  const users = allUsers.filter((u) => u.status === 'active');
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleLogin = (userId: string) => {
    setLoadingId(userId);
    setTimeout(() => {
      const result = login(userId);
      if (result.ok) {
        toast.success('¡Bienvenido!', 'Sesión iniciada en modo demo.');
        navigate(ROUTES.dashboard);
      } else {
        toast.error('No se pudo iniciar sesión', result.error);
        setLoadingId(null);
      }
    }, 450);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-pop dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
        Elegí un usuario para entrar
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cada rol muestra una experiencia distinta: el vendedor ve lo justo para vender, el administrador controla todo.
      </p>
      <div className="mt-5 flex flex-col gap-2.5">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => handleLogin(u.id)}
            disabled={loadingId !== null}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-primary-300 hover:bg-primary-50 hover:shadow-card disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-700 dark:hover:bg-slate-700"
          >
            <Avatar name={u.name} color={u.avatarColor} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                Entrar como {ROLE_LABELS[u.role]}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {u.name} · {u.email}
              </span>
            </span>
            <ArrowRight
              className={`size-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500 ${loadingId === u.id ? 'animate-pulse text-primary-500' : ''}`}
              aria-hidden
            />
          </button>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-slate-400 dark:text-slate-500">
        No se necesita contraseña: es una demo sin conexiones reales.
      </p>
    </div>
  );
}

/** Modo producción: login real contra el backend + registro de nuevo negocio. */
function RealAuthCard() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const updateSettings = useBusinessStore((s) => s.updateSettings);
  const completeOnboarding = useBusinessStore((s) => s.completeOnboarding);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finish = (session: Session) => {
    setSession({ user: session.user, token: session.token, businessId: session.businessId });
    updateSettings({ businessName: session.businessName });
    completeOnboarding();
    toast.success('¡Bienvenido!', session.businessName);
    navigate(ROUTES.dashboard);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      finish(await loginSupabase({ email, password }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-pop dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
        <LogIn className="size-4" aria-hidden /> Iniciar sesión
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
        <Input label="Contraseña" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
        <Button type="submit" size="lg" fullWidth loading={loading} className="mt-1">
          Ingresar
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        ¿No tenés cuenta? Se crea desde la página de suscripción al contratar el plan.
      </p>
    </div>
  );
}
