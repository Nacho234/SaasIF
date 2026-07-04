import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { isProdMode } from '@/config/appMode';
import { getMpStatus, startMpConnect, disconnectMp, type MpStatus } from '@/services/supabase/supabaseMpService';
import { useUiStore, toast } from '@/store/uiStore';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const EMPTY: MpStatus = { connected: false, nickname: '', email: '', mpUserId: '' };

export function MercadoPagoCard() {
  const [status, setStatus] = useState<MpStatus>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useSearchParams();
  const askConfirm = useUiStore((s) => s.askConfirm);

  const refresh = () => getMpStatus().then(setStatus).catch(() => {});

  useEffect(() => {
    if (isProdMode) refresh();
  }, []);

  // Volvés del OAuth de MP con ?mp=connected|error
  useEffect(() => {
    const mp = params.get('mp');
    if (!mp) return;
    if (mp === 'connected') {
      toast.success('Mercado Pago conectado', 'Ya podés cobrar con QR/link desde el POS.');
      refresh();
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

  const disconnect = () => {
    askConfirm({
      title: 'Desvincular Mercado Pago',
      message: 'Se va a desconectar tu cuenta. No vas a poder cobrar con MP hasta volver a conectarla.',
      danger: true,
      confirmLabel: 'Desvincular',
      onConfirm: async () => {
        try {
          await disconnectMp();
          setStatus(EMPTY);
          toast.success('Mercado Pago desvinculado');
        } catch (e) {
          toast.error('No se pudo desvincular', e instanceof Error ? e.message : undefined);
        }
      },
    });
  };

  return (
    <Card>
      <CardHeader title="Mercado Pago" subtitle="Conectá tu cuenta para cobrarles a tus clientes con QR o link de pago" />
      <CardBody>
        {status.connected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Cuenta conectada</p>
                {status.nickname && <p className="text-sm text-slate-700 dark:text-slate-200">{status.nickname}</p>}
                {status.email && <p className="text-xs text-slate-500 dark:text-slate-400">{status.email}</p>}
                {status.mpUserId && <p className="text-xs text-slate-400">ID de cuenta: {status.mpUserId}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" loading={loading} onClick={connect}>
                Reconectar
              </Button>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={disconnect}>
                Desvincular
              </Button>
            </div>
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
