import { useState } from 'react';
import { addCashMovement } from '@/services/cashRegisterService';
import { toast } from '@/store/uiStore';
import { useBusinessStore } from '@/store/businessStore';
import type { PaymentMethodId } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PAYMENT_METHODS } from '@/constants/paymentMethods';

type MovementKind = 'manual_income' | 'manual_expense' | 'withdrawal' | 'correction';

const KIND_OPTIONS = [
  { value: 'manual_income', label: 'Ingreso manual' },
  { value: 'manual_expense', label: 'Egreso manual' },
  { value: 'withdrawal', label: 'Retiro' },
  { value: 'correction', label: 'Corrección' },
];

export function CashMovementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const enabledMethods = useBusinessStore((s) => s.settings.enabledPaymentMethods);
  const [type, setType] = useState<MovementKind>('manual_income');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethodId>('cash');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const result = addCashMovement({
      type,
      amount: Number(amount),
      method,
      reason,
      notes,
      direction: type === 'correction' ? direction : undefined,
    });
    if (result.ok) {
      toast.success('Movimiento registrado', 'La caja se actualizó correctamente.');
      setAmount('');
      setReason('');
      setNotes('');
      setError('');
      onClose();
    } else {
      setError(result.error ?? 'No se pudo registrar el movimiento.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Movimiento de caja"
      description="Ingresos, egresos, retiros o correcciones manuales."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>Registrar movimiento</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as MovementKind)}
            options={KIND_OPTIONS}
          />
          <Input
            label="Monto"
            required
            type="number"
            min={0}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            leftIcon={<span className="text-sm font-semibold">$</span>}
          />
        </div>
        {type === 'correction' && (
          <Select
            label="Sentido de la corrección"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'in' | 'out')}
            options={[
              { value: 'in', label: 'Suma a la caja (+)' },
              { value: 'out', label: 'Resta de la caja (−)' },
            ]}
          />
        )}
        <Select
          label="Método"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethodId)}
          options={PAYMENT_METHODS.filter((m) => m.id !== 'customer_credit' && enabledMethods.includes(m.id)).map(
            (m) => ({ value: m.id, label: m.label }),
          )}
        />
        <Input
          label={type === 'manual_income' ? 'Motivo (opcional)' : 'Motivo'}
          required={type !== 'manual_income'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: cambio para el cajón, pago de flete…"
        />
        <Textarea label="Observación (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
