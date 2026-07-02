import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { openRegister } from '@/services/cashRegisterService';
import { toast } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { formatFriendlyDateTime } from '@/utils/format';

export function OpenCashModal({
  open,
  onClose,
  onOpened,
}: {
  open: boolean;
  onClose: () => void;
  onOpened?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    const value = Number(amount);
    if (amount === '' || Number.isNaN(value)) {
      setError('Ingresá el monto inicial en efectivo.');
      return;
    }
    if (value < 0) {
      setError('El monto inicial no puede ser negativo.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = openRegister({ openingAmount: value, notes });
      setLoading(false);
      if (result.ok) {
        toast.success('Caja abierta', `${result.register?.number} lista para vender.`);
        setAmount('');
        setNotes('');
        setError('');
        onClose();
        onOpened?.();
      } else {
        setError(result.error ?? 'No se pudo abrir la caja.');
      }
    }, 350);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Abrir caja"
      description="Contá el efectivo inicial del cajón antes de empezar a vender."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            <Wallet className="size-4" aria-hidden />
            Abrir caja
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Monto inicial en efectivo"
          required
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          error={error || undefined}
          leftIcon={<span className="text-sm font-semibold">$</span>}
          autoFocus
        />
        <Textarea
          label="Observación (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: turno mañana"
          rows={2}
        />
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Responsable: <strong className="text-slate-700 dark:text-slate-200">{user?.name}</strong> ·{' '}
          {formatFriendlyDateTime(new Date().toISOString())}
        </div>
      </div>
    </Modal>
  );
}
