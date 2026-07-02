import type { ProcessorId } from '@/types';

export const PROCESSORS: { id: ProcessorId; label: string }[] = [
  { id: 'posnet', label: 'Posnet' },
  { id: 'lapos', label: 'LaPos' },
  { id: 'payway', label: 'Payway' },
  { id: 'viumi', label: 'viüMi' },
  { id: 'mercadopago_point', label: 'Mercado Pago Point' },
  { id: 'getnet', label: 'Getnet' },
  { id: 'fiserv', label: 'Fiserv' },
  { id: 'other', label: 'Otra terminal' },
];
