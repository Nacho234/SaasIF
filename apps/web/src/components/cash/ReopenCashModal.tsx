import { useState } from 'react';
import { Unlock } from 'lucide-react';
import type { CashRegister } from '@/types';
import { reopenRegister } from '@/services/cashClosureService';
import { toast } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

export function ReopenCashModal({
  open,
  onClose,
  register,
  onReopened,
}: {
  open: boolean;
  onClose: () => void;
  register: CashRegister;
  onReopened?: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const result = reopenRegister({ registerId: register.id, reason });
    if (result.ok) {
      toast.success('Caja reabierta', `${register.number} volvió a estar operativa.`);
      setReason('');
      onClose();
      onReopened?.();
    } else {
      setError(result.error ?? 'No se pudo reabrir la caja.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reabrir caja ${register.number}`}
      description="La reapertura queda auditada y conserva el cierre original. Al volver a cerrar se genera una nueva versión del cierre."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submit}>
            <Unlock className="size-4" aria-hidden />
            Reabrir caja
          </Button>
        </>
      }
    >
      <Textarea
        label="Motivo de la reapertura"
        required
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError('');
        }}
        rows={3}
        placeholder="Ej: se registró una venta después del cierre"
        error={error || undefined}
      />
    </Modal>
  );
}
