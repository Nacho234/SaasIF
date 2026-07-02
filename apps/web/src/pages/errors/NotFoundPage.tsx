import { useNavigate } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in">
      <span className="mb-4 rounded-2xl bg-slate-100 p-5 text-slate-400 dark:bg-slate-800">
        <Compass className="size-10" aria-hidden />
      </span>
      <p className="font-display text-5xl font-bold text-slate-300 dark:text-slate-700">404</p>
      <h1 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-slate-50">Página no encontrada</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        La página que buscás no existe o fue movida. Usá el menú o volvé al inicio.
      </p>
      <Button className="mt-6" onClick={() => navigate(ROUTES.dashboard)}>
        <Home className="size-4" aria-hidden />
        Ir al inicio
      </Button>
    </div>
  );
}
