import { useState } from 'react';
import type { Product } from '@/types';
import { adjustStock } from '@/services/inventoryService';
import { toast } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

type AdjustType = 'manual_in' | 'manual_out' | 'adjust_up' | 'adjust_down';

export function StockAdjustModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}) {
  const [type, setType] = useState<AdjustType>('manual_in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!product) return null;

  const submit = () => {
    const result = adjustStock({
      productId: product.id,
      type,
      quantity: Number(quantity),
      reason,
      notes,
    });
    if (result.ok) {
      toast.success('Stock actualizado', `${product.name} ahora refleja el nuevo stock.`);
      setQuantity('');
      setReason('');
      setNotes('');
      setError('');
      onClose();
    } else {
      setError(result.error ?? 'No se pudo ajustar el stock.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Ajustar stock: ${product.name}`}
      description={`Stock actual: ${product.stock} unidades · mínimo ${product.minStock}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Registrar ajuste</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo de movimiento"
            value={type}
            onChange={(e) => setType(e.target.value as AdjustType)}
            options={[
              { value: 'manual_in', label: 'Ingreso de stock (+)' },
              { value: 'manual_out', label: 'Egreso de stock (−)' },
              { value: 'adjust_up', label: 'Ajuste positivo (+)' },
              { value: 'adjust_down', label: 'Ajuste negativo (−)' },
            ]}
          />
          <Input
            label="Cantidad"
            required
            type="number"
            min={1}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <Input
          label="Motivo"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: reposición, rotura, conteo físico…"
        />
        <Textarea label="Observación (opcional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
