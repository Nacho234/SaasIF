import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { isProdMode } from '@/config/appMode';
import { getMpStatus, startMpConnect } from '@/services/supabase/supabaseMpService';
import { toast } from '@/store/uiStore';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function MercadoPagoCard() {
  const [status, setStatus] = useState<{ connected: boolean; nickname: string }>({ connected: false, nickname: '' });
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (!isProdMode) return;
    getMpStatus().then(setStatus).catch(() => {});
  }, []);

  // Volvés del OAuth de MP con ?mp=connected|error
  useEffect(() => {
    const mp = params.get('mp');
    if (!mp) return;
    if (mp === 'connected') {
      toast.success('Mercado Pago conectado', 'Ya podés cobrar con QR/link desde el POS.');
      getMpStatus().then(setStatus).catch(() => {});
    } else {
      toast.error('No se pudo conectar Mercado Pago', 'Reintentá desde Configuración.');
    }
    params.delete('mp');
    setParams(params, { replace: true });
  }, [params, setParams]);

  if (!isProdMode) return null;

  const connect = async () => {
    setLoading(true);
    try {
      window.location.href = await startMpConnect();
    } catch (e) {
      toast.error('No se pudo iniciar la conexión', e instanceof Error ? e.message : undefined);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Mercado Pago" subtitle="Conectá tu cuenta para cobrarles a tus clientes con QR o link de pago" />
      <CardBody>
        {status.connected ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Cuenta conectada</p>
              {status.nickname && <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">{status.nickname}</p>}
            </div>
            <Button variant="secondary" size="sm" className="ml-auto" loading={loading} onClick={connect}>
              Reconectar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Todavía no conectaste Mercado Pago. Al conectarlo, los cobros de tus ventas van a tu propia cuenta.
            </p>
            <Button loading={loading} onClick={connect}>
              <CreditCard className="size-4" aria-hidden />
              Conectar Mercado Pago
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
