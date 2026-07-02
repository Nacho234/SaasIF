import { useNavigate, useParams } from 'react-router-dom';
import { Ban, ClipboardList, PackageCheck, Send } from 'lucide-react';
import { useSupplierStore } from '@/store/supplierStore';
import { receivePurchase } from '@/services/purchaseService';
import { logAudit } from '@/services/auditService';
import { toast, useUiStore } from '@/store/uiStore';
import { formatCurrency, formatFriendlyDateTime } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PurchaseStatusBadge } from '@/components/ui/StatusBadge';

export function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const purchase = useSupplierStore((s) => s.purchases.find((p) => p.id === id));
  const updatePurchase = useSupplierStore((s) => s.updatePurchase);
  const askConfirm = useUiStore((s) => s.askConfirm);

  if (!purchase) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Compra no encontrada"
        action={<Button onClick={() => navigate(ROUTES.purchases)}>Volver a compras</Button>}
      />
    );
  }

  const markSent = () => {
    updatePurchase(purchase.id, { status: 'sent' });
    logAudit({ action: 'purchase_sent', module: 'purchases', description: `Marcó la compra ${purchase.number} como enviada` });
    toast.success('Compra marcada como enviada');
  };

  const markReceived = () => {
    askConfirm({
      title: 'Recibir compra',
      message: `Se sumará el stock de ${purchase.items.length} producto(s) y se actualizarán los costos. ¿Confirmar recepción?`,
      confirmLabel: 'Recibir y sumar stock',
      onConfirm: () => {
        const result = receivePurchase(purchase.id);
        if (result.ok) toast.success('Compra recibida', 'El stock fue actualizado con los productos de la orden.');
        else toast.error('No se pudo recibir', result.error);
      },
    });
  };

  const cancel = () => {
    askConfirm({
      title: 'Cancelar compra',
      message: 'La orden quedará cancelada y no afectará el stock. ¿Continuar?',
      confirmLabel: 'Cancelar orden',
      danger: true,
      onConfirm: () => {
        updatePurchase(purchase.id, { status: 'cancelled' });
        logAudit({ action: 'purchase_cancelled', module: 'purchases', description: `Canceló la compra ${purchase.number}`, severity: 'warning' });
        toast.success('Compra cancelada');
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader
        title={`Compra ${purchase.number}`}
        subtitle={`${purchase.supplierName} · creada ${formatFriendlyDateTime(purchase.date)} por ${purchase.createdByName}`}
        backTo={ROUTES.purchases}
        actions={
          <>
            <PurchaseStatusBadge status={purchase.status} />
            {purchase.status === 'draft' && (
              <Button variant="secondary" onClick={markSent}>
                <Send className="size-4" aria-hidden />
                Marcar enviada
              </Button>
            )}
            {(purchase.status === 'draft' || purchase.status === 'sent') && (
              <>
                <Button variant="success" onClick={markReceived}>
                  <PackageCheck className="size-4" aria-hidden />
                  Recibir compra
                </Button>
                <Button variant="outline-danger" onClick={cancel}>
                  <Ban className="size-4" aria-hidden />
                  Cancelar
                </Button>
              </>
            )}
          </>
        }
      />

      {purchase.status === 'received' && purchase.receivedAt && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
          Recibida {formatFriendlyDateTime(purchase.receivedAt)}. El stock ya fue sumado al inventario.
        </div>
      )}

      <Card>
        <CardHeader title="Detalle de la orden" subtitle={`${purchase.items.length} productos`} />
        <CardBody className="px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase dark:border-slate-800">
                <th className="px-5 py-2 text-left font-semibold">Producto</th>
                <th className="px-2 py-2 text-center font-semibold">Cant.</th>
                <th className="px-2 py-2 text-right font-semibold">Costo unit.</th>
                <th className="px-5 py-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                  <td className="px-5 py-2.5 font-medium">{item.productName}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{item.quantity}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(item.unitCost)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between border-t border-slate-100 px-5 pt-3 font-display text-lg font-bold dark:border-slate-800">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(purchase.total)}</span>
          </div>
          {purchase.notes && (
            <p className="mx-5 mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {purchase.notes}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
