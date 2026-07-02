import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ban, Printer, Receipt, Undo2 } from 'lucide-react';
import { useSalesStore } from '@/store/salesStore';
import { useCashStore } from '@/store/cashStore';
import { cancelSale } from '@/services/salesService';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/store/uiStore';
import { formatCurrency, formatFriendlyDateTime } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { REFUND_METHOD_LABELS, RETURN_REASON_LABELS } from '@/constants/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { SaleStatusBadge } from '@/components/ui/StatusBadge';

export function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const sale = useSalesStore((s) => s.sales.find((x) => x.id === id));
  const allReturns = useSalesStore((s) => s.returns);
  const returns = allReturns.filter((r) => r.saleId === id);
  const register = useCashStore((s) => s.registers.find((r) => r.id === sale?.cashRegisterId));

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  if (!sale) {
    return (
      <EmptyState
        icon={Receipt}
        title="Venta no encontrada"
        action={<Button onClick={() => navigate(ROUTES.sales)}>Volver al historial</Button>}
      />
    );
  }

  const canReturn =
    sale.status !== 'cancelled' &&
    sale.status !== 'returned' &&
    sale.items.some((i) => i.quantity > i.returnedQuantity);

  const submitCancel = () => {
    const result = cancelSale(sale.id, cancelReason);
    if (result.ok) {
      toast.success('Venta anulada', 'El stock fue repuesto y la caja ajustada.');
      setCancelOpen(false);
    } else {
      setCancelError(result.error ?? 'No se pudo anular la venta.');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Venta ${sale.saleNumber}`}
        subtitle={`${formatFriendlyDateTime(sale.date)} · ${sale.sellerName}`}
        backTo={ROUTES.sales}
        actions={
          <>
            <SaleStatusBadge status={sale.status} />
            <Link to={ROUTES.receipt(sale.id)}>
              <Button variant="secondary">
                <Printer className="size-4" aria-hidden />
                Ver ticket
              </Button>
            </Link>
            {canReturn && can('create_return') && (
              <Link to={`${ROUTES.returnCreate}?saleId=${sale.id}`}>
                <Button variant="secondary">
                  <Undo2 className="size-4" aria-hidden />
                  Devolución
                </Button>
              </Link>
            )}
            {sale.status !== 'cancelled' && can('cancel_sale') && (
              <Button variant="outline-danger" onClick={() => setCancelOpen(true)}>
                <Ban className="size-4" aria-hidden />
                Anular
              </Button>
            )}
          </>
        }
      />

      {sale.status === 'cancelled' && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          Venta anulada {sale.cancelledAt ? formatFriendlyDateTime(sale.cancelledAt) : ''}. Motivo: {sale.cancelReason}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Productos" subtitle={`${sale.items.length} ítems`} />
          <CardBody className="px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase dark:border-slate-800">
                  <th className="px-5 py-2 text-left font-semibold">Producto</th>
                  <th className="px-2 py-2 text-center font-semibold">Cant.</th>
                  <th className="px-2 py-2 text-right font-semibold">Precio</th>
                  <th className="px-5 py-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {item.productName}
                        {item.isCombo && <span className="ml-1.5 text-[10px] font-bold text-violet-500">COMBO</span>}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.sku}
                        {item.returnedQuantity > 0 && (
                          <span className="ml-2 text-amber-600">· {item.returnedQuantity} devuelto{item.returnedQuantity > 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums">{item.quantity}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="flex flex-col gap-1 border-t border-slate-100 px-5 pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between text-slate-500"><dt>Subtotal</dt><dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd></div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600"><dt>Descuento</dt><dd className="tabular-nums">−{formatCurrency(sale.discountTotal)}</dd></div>
              )}
              {sale.surchargeTotal > 0 && (
                <div className="flex justify-between text-slate-500"><dt>Recargo</dt><dd className="tabular-nums">+{formatCurrency(sale.surchargeTotal)}</dd></div>
              )}
              <div className="flex justify-between pt-1 font-display text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{formatCurrency(sale.total)}</dd></div>
            </dl>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Datos de la venta" />
            <CardBody>
              <dl className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Cliente</dt>
                  <dd className="font-medium">
                    {sale.customerId ? (
                      <Link to={ROUTES.customerDetail(sale.customerId)} className="text-primary-600 hover:underline">
                        {sale.customerName}
                      </Link>
                    ) : (
                      'Consumidor final'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between"><dt className="text-slate-500">Vendedor</dt><dd className="font-medium">{sale.sellerName}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Caja</dt>
                  <dd className="font-medium">
                    {register ? (
                      <Link to={ROUTES.cashDetail(register.id)} className="text-primary-600 hover:underline">
                        {register.number}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pagos" />
            <CardBody>
              <ul className="flex flex-col gap-2 text-sm">
                {sale.payments.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span className="text-slate-500">
                      {PAYMENT_METHOD_LABELS[p.method]}
                      {p.installments > 1 && ` (${p.installments} cuotas)`}
                      {p.cardLast4 && ` ****${p.cardLast4}`}
                      {p.reference && <span className="block text-xs text-slate-400">{p.reference}</span>}
                    </span>
                    <span className="font-semibold tabular-nums">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
                {sale.change > 0 && (
                  <li className="flex justify-between border-t border-slate-100 pt-2 text-slate-500 dark:border-slate-800">
                    <span>Vuelto</span>
                    <span className="font-semibold tabular-nums">−{formatCurrency(sale.change)}</span>
                  </li>
                )}
              </ul>
            </CardBody>
          </Card>

          {returns.length > 0 && (
            <Card>
              <CardHeader title="Devoluciones" />
              <CardBody>
                <ul className="flex flex-col gap-3 text-sm">
                  {returns.map((r) => (
                    <li key={r.id} className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                      <p className="font-medium">{formatFriendlyDateTime(r.date)} · {r.userName}</p>
                      <p className="text-xs text-slate-500">
                        {RETURN_REASON_LABELS[r.reason]} · {REFUND_METHOD_LABELS[r.refundMethod]}
                      </p>
                      <ul className="mt-1 text-xs text-slate-500">
                        {r.items.map((it, i) => (
                          <li key={i}>{it.quantity}× {it.productName}{it.restock ? ' (repuesto al stock)' : ''}</li>
                        ))}
                      </ul>
                      {r.refundAmount > 0 && (
                        <p className="mt-1 text-xs font-bold text-red-500 tabular-nums">Reintegro: {formatCurrency(r.refundAmount)}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Anular venta ${sale.saleNumber}`}
        description="Se repone el stock de todos los productos y, si la caja del turno sigue abierta, se registra la salida del dinero."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>Volver</Button>
            <Button variant="danger" onClick={submitCancel}>
              <Ban className="size-4" aria-hidden />
              Anular venta
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo de anulación"
          required
          value={cancelReason}
          onChange={(e) => {
            setCancelReason(e.target.value);
            setCancelError('');
          }}
          error={cancelError || undefined}
          placeholder="Ej: error al cargar los productos"
          autoFocus
        />
      </Modal>
    </div>
  );
}
