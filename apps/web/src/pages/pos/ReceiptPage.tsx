import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, Home, Mail, MessageCircle, Printer, QrCode, Receipt, ShoppingCart, Store } from 'lucide-react';
import { useSalesStore } from '@/store/salesStore';
import { useBusinessStore } from '@/store/businessStore';
import { toast } from '@/store/uiStore';
import { logAudit } from '@/services/auditService';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { SaleStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

export function ReceiptPage() {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const sale = useSalesStore((s) => s.sales.find((x) => x.id === saleId));
  const settings = useBusinessStore((s) => s.settings);

  if (!sale) {
    return (
      <EmptyState
        icon={Receipt}
        title="Comprobante no encontrado"
        description="La venta que buscás no existe o fue eliminada."
        action={<Button onClick={() => navigate(ROUTES.sales)}>Ir al historial</Button>}
      />
    );
  }

  const simulate = (action: string) => {
    logAudit({ action: 'receipt_action', module: 'sales', description: `${action} del comprobante ${sale.saleNumber} (simulado)` });
    toast.info(`${action} simulado`, 'En la versión completa esto se conecta al servicio real.');
  };

  return (
    <div className="mx-auto max-w-lg animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">Comprobante</h1>
        <SaleStatusBadge status={sale.status} />
      </div>

      {/* Ticket */}
      <div className="print-area rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col items-center border-b border-dashed border-slate-200 pb-4 text-center dark:border-slate-700">
          {settings.receiptShowLogo &&
            (settings.logo ? (
              <img src={settings.logo} alt="" className="mb-2 size-12 rounded-xl object-cover" />
            ) : (
              <span className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary-600 text-white">
                <Store className="size-6" />
              </span>
            ))}
          <p className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">{settings.businessName}</p>
          {settings.receiptShowAddress && settings.address && (
            <p className="text-xs text-slate-500">{settings.address}</p>
          )}
          {settings.phone && <p className="text-xs text-slate-500">Tel: {settings.phone}</p>}
          {settings.receiptShowCuit && settings.cuit && <p className="text-xs text-slate-500">CUIT: {settings.cuit}</p>}
          <p className="mt-2 text-[10px] tracking-wide text-slate-400 uppercase">Comprobante no fiscal · Demo</p>
        </div>

        <div className="flex justify-between border-b border-dashed border-slate-200 py-3 text-xs text-slate-500 dark:border-slate-700">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">{sale.saleNumber}</p>
            <p>{formatDateTime(sale.date)}</p>
          </div>
          <div className="text-right">
            <p>Vendedor: {sale.sellerName}</p>
            <p>Cliente: {sale.customerName ?? 'Consumidor final'}</p>
          </div>
        </div>

        <table className="w-full py-2 text-sm">
          <thead>
            <tr className="text-[10px] tracking-wide text-slate-400 uppercase">
              <th className="py-2 text-left font-semibold">Producto</th>
              <th className="py-2 text-center font-semibold">Cant.</th>
              <th className="py-2 text-right font-semibold">Precio</th>
              <th className="py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                <td className="py-1">
                  {item.productName}
                  {item.isCombo && <span className="ml-1 text-[10px] font-bold text-violet-500">COMBO</span>}
                </td>
                <td className="py-1 text-center tabular-nums">{item.quantity}</td>
                <td className="py-1 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                <td className="py-1 text-right font-semibold tabular-nums">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="border-t border-dashed border-slate-200 pt-3 text-sm dark:border-slate-700">
          <div className="flex justify-between text-slate-500">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd>
          </div>
          {sale.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-600">
              <dt>Descuento</dt>
              <dd className="tabular-nums">−{formatCurrency(sale.discountTotal)}</dd>
            </div>
          )}
          {sale.surchargeTotal > 0 && (
            <div className="flex justify-between text-slate-500">
              <dt>Recargo</dt>
              <dd className="tabular-nums">+{formatCurrency(sale.surchargeTotal)}</dd>
            </div>
          )}
          <div className="mt-1 flex justify-between font-display text-lg font-bold text-slate-900 dark:text-slate-50">
            <dt>TOTAL</dt>
            <dd className="tabular-nums">{formatCurrency(sale.total)}</dd>
          </div>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-slate-500">
            {sale.payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>
                  {PAYMENT_METHOD_LABELS[p.method]}
                  {p.installments > 1 ? ` (${p.installments} cuotas)` : ''}
                  {p.cardLast4 ? ` ****${p.cardLast4}` : ''}
                  {p.reference ? ` · ${p.reference}` : ''}
                </span>
                <span className="tabular-nums">{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {sale.change > 0 && (
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Vuelto</span>
                <span className="tabular-nums">{formatCurrency(sale.change)}</span>
              </div>
            )}
          </div>
        </dl>

        <div className="mt-4 flex flex-col items-center gap-2 border-t border-dashed border-slate-200 pt-4 text-center dark:border-slate-700">
          {settings.receiptShowQr && (
            <span className="rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300" aria-label="QR simulado">
              <QrCode className="size-14" />
            </span>
          )}
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{settings.receiptMessage}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button
          variant="secondary"
          onClick={() => {
            window.print();
            simulate('Impresión');
          }}
        >
          <Printer className="size-4" aria-hidden />
          Imprimir
        </Button>
        <Button variant="secondary" onClick={() => simulate('Descarga de PDF')}>
          <Download className="size-4" aria-hidden />
          PDF
        </Button>
        <Button variant="secondary" onClick={() => simulate('Envío por email')}>
          <Mail className="size-4" aria-hidden />
          Email
        </Button>
        <Button variant="secondary" onClick={() => simulate('Envío por WhatsApp')}>
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button size="lg" fullWidth onClick={() => navigate(ROUTES.pos)}>
          <ShoppingCart className="size-4" aria-hidden />
          Nueva venta
        </Button>
        <Link to={ROUTES.sales} className="flex-1">
          <Button variant="secondary" size="lg" fullWidth>
            Ver historial
          </Button>
        </Link>
        <Link to={ROUTES.dashboard} className="flex-1">
          <Button variant="ghost" size="lg" fullWidth>
            <Home className="size-4" aria-hidden />
            Inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
