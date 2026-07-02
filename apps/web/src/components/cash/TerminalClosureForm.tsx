import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import type { ProcessorId } from '@/types';
import { addTerminalClosure } from '@/services/terminalClosureService';
import { PROCESSORS } from '@/constants/processors';
import { toast } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

export function TerminalClosureForm({
  open,
  onClose,
  registerId,
  advanced,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  registerId: string;
  /** Modo avanzado: pide lote, número de cierre y totales por medio. */
  advanced: boolean;
  onAdded?: () => void;
}) {
  const [processor, setProcessor] = useState<ProcessorId>('payway');
  const [terminalLabel, setTerminalLabel] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [closingNumber, setClosingNumber] = useState('');
  const [terminalDebit, setTerminalDebit] = useState('');
  const [terminalCredit, setTerminalCredit] = useState('');
  const [terminalQr, setTerminalQr] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setProcessor('payway');
    setTerminalLabel('');
    setBatchNumber('');
    setClosingNumber('');
    setTerminalDebit('');
    setTerminalCredit('');
    setTerminalQr('');
    setNotes('');
    setError('');
  };

  const submit = () => {
    const result = addTerminalClosure({
      cashRegisterId: registerId,
      processor,
      terminalLabel,
      batchNumber,
      closingNumber,
      terminalDebit: Number(terminalDebit) || 0,
      terminalCredit: Number(terminalCredit) || 0,
      terminalQr: Number(terminalQr) || 0,
      notes,
      matchSystem: !advanced,
    });
    if (result.ok) {
      toast.success('Terminal cargada', 'Se agregó al cierre de terminales.');
      reset();
      onClose();
      onAdded?.();
    } else {
      setError(result.error ?? 'No se pudo cargar la terminal.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cargar cierre de terminal"
      description={
        advanced
          ? 'Cargá el lote y los totales que informa la terminal para conciliar contra el sistema.'
          : 'Cargá la terminal. En modo simple alcanza con identificarla y confirmar.'
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>
            <CreditCard className="size-4" aria-hidden />
            Agregar terminal
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Procesador"
            value={processor}
            onChange={(e) => setProcessor(e.target.value as ProcessorId)}
            options={PROCESSORS.map((p) => ({ value: p.id, label: p.label }))}
          />
          <Input
            label="Terminal"
            required
            value={terminalLabel}
            onChange={(e) => {
              setTerminalLabel(e.target.value);
              setError('');
            }}
            placeholder="Ej: Caja 1"
            error={error || undefined}
          />
        </div>

        {advanced && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Número de lote" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Ej: 0054" />
              <Input label="Número de cierre" value={closingNumber} onChange={(e) => setClosingNumber(e.target.value)} placeholder="Ej: 12" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Débito informado" type="number" min={0} inputMode="decimal" value={terminalDebit} onChange={(e) => setTerminalDebit(e.target.value)} leftIcon={<span className="text-sm font-semibold">$</span>} />
              <Input label="Crédito informado" type="number" min={0} inputMode="decimal" value={terminalCredit} onChange={(e) => setTerminalCredit(e.target.value)} leftIcon={<span className="text-sm font-semibold">$</span>} />
              <Input label="QR / MP informado" type="number" min={0} inputMode="decimal" value={terminalQr} onChange={(e) => setTerminalQr(e.target.value)} leftIcon={<span className="text-sm font-semibold">$</span>} />
            </div>
          </>
        )}

        <Textarea
          label="Observaciones"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ej: una venta se cobró por otra terminal"
        />
      </div>
    </Modal>
  );
}
