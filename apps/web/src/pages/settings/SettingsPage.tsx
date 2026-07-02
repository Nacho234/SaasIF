import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Store, Trash2, Wrench } from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';
import { usePermissions } from '@/hooks/usePermissions';
import { DeleteBusinessModal } from './DeleteBusinessModal';
import { logAudit } from '@/services/auditService';
import { toast } from '@/store/uiStore';
import { BUSINESS_CATEGORIES, PRESET_COLORS } from '@/constants/demo';
import { PAYMENT_METHODS } from '@/constants/paymentMethods';
import { ROUTES } from '@/constants/routes';
import type { BusinessSettings, PaymentMethodId } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/utils/cn';

const TABS = [
  { id: 'general', label: 'Negocio' },
  { id: 'sales', label: 'Caja y ventas' },
  { id: 'receipt', label: 'Ticket' },
  { id: 'appearance', label: 'Apariencia' },
];

export function SettingsPage() {
  const settings = useBusinessStore((s) => s.settings);
  const updateSettings = useBusinessStore((s) => s.updateSettings);
  const { can } = usePermissions();
  const [tab, setTab] = useState('general');
  const [draft, setDraft] = useState<BusinessSettings>({ ...settings });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const set = (patch: Partial<BusinessSettings>) => setDraft((d) => ({ ...d, ...patch }));

  const togglePayment = (id: PaymentMethodId) => {
    const enabled = draft.enabledPaymentMethods.includes(id);
    if (enabled && draft.enabledPaymentMethods.length === 1) {
      toast.error('Tiene que quedar al menos un método de pago habilitado.');
      return;
    }
    set({
      enabledPaymentMethods: enabled
        ? draft.enabledPaymentMethods.filter((m) => m !== id)
        : [...draft.enabledPaymentMethods, id],
    });
  };

  const save = () => {
    if (!draft.businessName.trim()) {
      toast.error('El nombre del local es obligatorio.');
      return;
    }
    updateSettings(draft);
    logAudit({ action: 'settings_updated', module: 'settings', description: 'Modificó la configuración del negocio', severity: 'info' });
    toast.success('Configuración guardada', 'Los cambios se aplicaron en toda la app.');
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader
        title="Configuración"
        subtitle="Datos del negocio, reglas de venta y apariencia"
        actions={
          <Button onClick={save}>
            <Save className="size-4" aria-hidden />
            Guardar cambios
          </Button>
        }
      />

      <Tabs className="mb-4" tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'general' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Datos del negocio" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre del local" required value={draft.businessName} onChange={(e) => set({ businessName: e.target.value })} containerClassName="sm:col-span-2" />
              <Select label="Rubro" value={draft.category} onChange={(e) => set({ category: e.target.value })} options={BUSINESS_CATEGORIES.map((c) => ({ value: c, label: c }))} />
              <Input label="CUIT" value={draft.cuit} onChange={(e) => set({ cuit: e.target.value })} />
              <Input label="Dirección" value={draft.address} onChange={(e) => set({ address: e.target.value })} containerClassName="sm:col-span-2" />
              <Input label="Teléfono" type="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
              <Input label="Email" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
              <Select
                label="Moneda"
                value={draft.currency}
                onChange={(e) => set({ currency: e.target.value as 'ARS' | 'USD' })}
                options={[
                  { value: 'ARS', label: 'Peso argentino (ARS)' },
                  { value: 'USD', label: 'Dólar (USD)' },
                ]}
              />
              <Input label="Zona horaria" value={draft.timezone} onChange={(e) => set({ timezone: e.target.value })} hint="Solo visual en la demo" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Logo" subtitle="Logo mock: subí una imagen o usá el ícono por defecto" />
            <CardBody className="flex items-center gap-4">
              {draft.logo ? (
                <img src={draft.logo} alt="Logo" className="size-14 rounded-xl object-cover" />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-xl bg-primary-600 text-white">
                  <Store className="size-7" />
                </span>
              )}
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    Subir imagen
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => set({ logo: String(reader.result) });
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {draft.logo && (
                  <Button variant="ghost" onClick={() => set({ logo: null })}>
                    Quitar logo
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'sales' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Caja" />
            <CardBody className="flex flex-col gap-4">
              <Switch checked={draft.requireOpenCashToSell} onChange={(v) => set({ requireOpenCashToSell: v })} label="Requerir caja abierta para vender" description="Recomendado para mantener el control del efectivo" />
              <Switch checked={draft.allowSellerOpenCash} onChange={(v) => set({ allowSellerOpenCash: v })} label="Permitir que el vendedor abra caja" />
              <Switch checked={draft.allowSellerCloseCash} onChange={(v) => set({ allowSellerCloseCash: v })} label="Permitir que el vendedor cierre caja" />
              <Switch checked={draft.requireNoteOnCashDifference} onChange={(v) => set({ requireNoteOnCashDifference: v })} label="Observación obligatoria si hay diferencia de caja" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Ventas" />
            <CardBody className="flex flex-col gap-4">
              <Switch checked={draft.allowNegativeStock} onChange={(v) => set({ allowNegativeStock: v })} label="Permitir venta sin stock" description="Si está apagado, el POS bloquea ventas sin stock disponible" />
              <Switch checked={draft.allowDiscounts} onChange={(v) => set({ allowDiscounts: v })} label="Permitir descuentos" />
              <Input
                label="Máximo descuento permitido (%)"
                type="number"
                min={0}
                max={100}
                value={draft.maxDiscountPercent}
                onChange={(e) => set({ maxDiscountPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                containerClassName="max-w-xs"
              />
              <Switch checked={draft.allowCustomerCredit} onChange={(v) => set({ allowCustomerCredit: v })} label="Permitir cuenta corriente (fiado)" description="Siempre requiere seleccionar un cliente" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Stock" />
            <CardBody className="flex flex-col gap-4">
              <Input
                label="Stock mínimo por defecto"
                type="number"
                min={0}
                value={draft.defaultMinStock}
                onChange={(e) => set({ defaultMinStock: Math.max(0, Number(e.target.value)) })}
                containerClassName="max-w-xs"
              />
              <Switch checked={draft.lowStockAlerts} onChange={(v) => set({ lowStockAlerts: v })} label="Alertar bajo stock" />
              <Switch checked={draft.outOfStockAlerts} onChange={(v) => set({ outOfStockAlerts: v })} label="Alertar sin stock" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Métodos de pago habilitados" />
            <CardBody className="flex flex-col gap-4">
              {PAYMENT_METHODS.map((m) => (
                <Switch
                  key={m.id}
                  checked={draft.enabledPaymentMethods.includes(m.id)}
                  onChange={() => togglePayment(m.id)}
                  label={m.label}
                />
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'receipt' && (
        <Card>
          <CardHeader title="Comprobante / ticket" subtitle="Cómo se muestra el ticket después de cada venta" />
          <CardBody className="flex flex-col gap-4">
            <Switch checked={draft.receiptShowLogo} onChange={(v) => set({ receiptShowLogo: v })} label="Mostrar logo" />
            <Switch checked={draft.receiptShowAddress} onChange={(v) => set({ receiptShowAddress: v })} label="Mostrar dirección" />
            <Switch checked={draft.receiptShowCuit} onChange={(v) => set({ receiptShowCuit: v })} label="Mostrar CUIT" />
            <Switch checked={draft.receiptShowQr} onChange={(v) => set({ receiptShowQr: v })} label="Mostrar QR simulado" />
            <Textarea label="Mensaje final del ticket" rows={2} value={draft.receiptMessage} onChange={(e) => set({ receiptMessage: e.target.value })} />
          </CardBody>
        </Card>
      )}

      {tab === 'appearance' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Color principal" subtitle="Se aplica a botones, menús y acentos de toda la app" />
            <CardBody>
              <div className="flex flex-wrap items-center gap-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => set({ primaryColor: color.value })}
                    aria-label={color.name}
                    title={color.name}
                    className={cn(
                      'size-10 cursor-pointer rounded-full transition-transform hover:scale-110',
                      draft.primaryColor === color.value && 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white',
                    )}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  Personalizado
                  <input
                    type="color"
                    value={draft.primaryColor}
                    onChange={(e) => set({ primaryColor: e.target.value })}
                    className="size-10 cursor-pointer rounded-lg border border-slate-200 bg-transparent dark:border-slate-700"
                    aria-label="Color personalizado"
                  />
                </label>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tema y densidad" />
            <CardBody className="flex flex-col gap-4">
              <Switch checked={draft.theme === 'dark'} onChange={(v) => set({ theme: v ? 'dark' : 'light' })} label="Modo oscuro" />
              <Select
                label="Densidad de la interfaz"
                value={draft.density}
                onChange={(e) => set({ density: e.target.value as 'comfortable' | 'compact' })}
                options={[
                  { value: 'comfortable', label: 'Cómoda' },
                  { value: 'compact', label: 'Compacta (más filas por pantalla)' },
                ]}
                containerClassName="max-w-xs"
              />
            </CardBody>
          </Card>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          ¿Datos demo, backups o reset del sistema?
        </p>
        <Link to={ROUTES.tools} className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline">
          <Wrench className="size-4" aria-hidden />
          Ir a Herramientas
        </Link>
      </div>

      <div className="mt-4 flex justify-end">
        <Button size="lg" onClick={save}>
          <Save className="size-4" aria-hidden />
          Guardar cambios
        </Button>
      </div>

      {/* Zona peligrosa — solo admin */}
      {can('manage_settings') && (
        <Card className="mt-8 border-red-200 dark:border-red-900">
          <CardHeader
            title={<span className="text-red-600 dark:text-red-400">Zona peligrosa</span>}
            subtitle="Eliminar el negocio borra todos sus datos y no se puede deshacer"
          />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Se eliminan productos, clientes, ventas, caja, usuarios y configuración.
            </p>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" aria-hidden />
              Eliminar negocio
            </Button>
          </CardBody>
        </Card>
      )}

      <DeleteBusinessModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
