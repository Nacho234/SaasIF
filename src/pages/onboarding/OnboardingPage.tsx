import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Rocket, Store } from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';
import { logAudit } from '@/services/auditService';
import { toast } from '@/store/uiStore';
import { ROUTES } from '@/constants/routes';
import { APP_NAME, BUSINESS_CATEGORIES, PRESET_COLORS } from '@/constants/demo';
import { PAYMENT_METHODS } from '@/constants/paymentMethods';
import type { BusinessSettings, PaymentMethodId } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/utils/cn';

const STEPS = ['Negocio', 'Preferencias', 'Pagos', 'Apariencia', 'Listo'];

export function OnboardingPage() {
  const settings = useBusinessStore((s) => s.settings);
  const updateSettings = useBusinessStore((s) => s.updateSettings);
  const completeOnboarding = useBusinessStore((s) => s.completeOnboarding);
  const onboardingCompleted = useBusinessStore((s) => s.onboardingCompleted);
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BusinessSettings>({ ...settings });
  const [error, setError] = useState('');

  if (onboardingCompleted) return <Navigate to={ROUTES.dashboard} replace />;

  const set = (patch: Partial<BusinessSettings>) => setDraft((d) => ({ ...d, ...patch }));

  const togglePayment = (id: PaymentMethodId) => {
    const enabled = draft.enabledPaymentMethods.includes(id);
    if (enabled && draft.enabledPaymentMethods.length === 1) return;
    set({
      enabledPaymentMethods: enabled
        ? draft.enabledPaymentMethods.filter((m) => m !== id)
        : [...draft.enabledPaymentMethods, id],
    });
  };

  const next = () => {
    if (step === 0 && !draft.businessName.trim()) {
      setError('El nombre del local es obligatorio.');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = (useDemoDefaults: boolean) => {
    if (!useDemoDefaults) updateSettings(draft);
    completeOnboarding();
    logAudit({
      action: 'onboarding_completed',
      module: 'settings',
      description: useDemoDefaults
        ? 'Configuración inicial: se usaron los datos de demostración'
        : 'Completó la configuración inicial del negocio',
      severity: 'success',
    });
    toast.success('¡Todo listo!', 'Tu local ya está configurado. Podés cambiar esto cuando quieras.');
    navigate(ROUTES.dashboard);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Store className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">
              Configuremos tu local
            </h1>
            <p className="text-xs text-slate-500">Paso {step + 1} de {STEPS.length} · {APP_NAME}</p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => finish(true)}>
            Saltar y usar datos demo
          </Button>
        </div>

        {/* Indicador de pasos */}
        <div className="mb-6 flex items-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemax={STEPS.length}>
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  i < step
                    ? 'bg-emerald-500 text-white'
                    : i === step
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-800',
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </div>
              <span className={cn('text-[10px] font-medium', i === step ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400')}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nombre del local"
                required
                value={draft.businessName}
                onChange={(e) => set({ businessName: e.target.value })}
                error={error || undefined}
                containerClassName="sm:col-span-2"
                placeholder="Ej: Petshop San Martín"
              />
              <Select
                label="Rubro"
                value={draft.category}
                onChange={(e) => set({ category: e.target.value })}
                options={BUSINESS_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Input label="CUIT (opcional)" value={draft.cuit} onChange={(e) => set({ cuit: e.target.value })} placeholder="30-12345678-9" />
              <Input label="Dirección" value={draft.address} onChange={(e) => set({ address: e.target.value })} containerClassName="sm:col-span-2" />
              <Input label="Teléfono" type="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
              <Input label="Email" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Moneda"
                  value={draft.currency}
                  onChange={(e) => set({ currency: e.target.value as 'ARS' | 'USD' })}
                  options={[
                    { value: 'ARS', label: 'Peso argentino (ARS)' },
                    { value: 'USD', label: 'Dólar (USD)' },
                  ]}
                />
                <Input
                  label="Stock mínimo por defecto"
                  type="number"
                  min={0}
                  value={draft.defaultMinStock}
                  onChange={(e) => set({ defaultMinStock: Math.max(0, Number(e.target.value)) })}
                  hint="Para alertar bajo stock en productos nuevos"
                />
                <Input
                  label="Máximo descuento permitido (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.maxDiscountPercent}
                  onChange={(e) => set({ maxDiscountPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                />
              </div>
              <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <Switch
                  checked={draft.requireOpenCashToSell}
                  onChange={(v) => set({ requireOpenCashToSell: v })}
                  label="Requerir caja abierta para vender"
                  description="Recomendado: evita ventas sin control de caja"
                />
                <Switch
                  checked={draft.allowNegativeStock}
                  onChange={(v) => set({ allowNegativeStock: v })}
                  label="Permitir ventas sin stock"
                  description="Si está apagado, no se puede vender más que el stock disponible"
                />
                <Switch
                  checked={draft.allowCustomerCredit}
                  onChange={(v) => set({ allowCustomerCredit: v })}
                  label="Habilitar cuenta corriente (fiado)"
                  description="Requiere seleccionar un cliente en la venta"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Elegí los métodos de pago que acepta tu local. Podés cambiarlos después.
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {PAYMENT_METHODS.map((method) => {
                  const enabled = draft.enabledPaymentMethods.includes(method.id);
                  return (
                    <button
                      key={method.id}
                      onClick={() => togglePayment(method.id)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-colors',
                        enabled
                          ? 'border-primary-400 bg-primary-50 dark:border-primary-700 dark:bg-primary-950'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                      )}
                    >
                      <method.icon className={cn('size-5', enabled ? 'text-primary-600' : 'text-slate-400')} aria-hidden />
                      <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{method.label}</span>
                      <span
                        className={cn(
                          'flex size-5 items-center justify-center rounded-full border-2',
                          enabled ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300',
                        )}
                      >
                        {enabled && <Check className="size-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Color principal</p>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => set({ primaryColor: color.value })}
                      aria-label={color.name}
                      className={cn(
                        'size-10 cursor-pointer rounded-full transition-transform hover:scale-110',
                        draft.primaryColor === color.value && 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white',
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <Switch
                  checked={draft.theme === 'dark'}
                  onChange={(v) => set({ theme: v ? 'dark' : 'light' })}
                  label="Modo oscuro"
                  description="También se puede cambiar desde el menú de usuario"
                />
              </div>
              <Textarea
                label="Mensaje final del ticket"
                value={draft.receiptMessage}
                onChange={(e) => set({ receiptMessage: e.target.value })}
                placeholder="¡Gracias por tu compra!"
              />
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="rounded-full bg-emerald-100 p-4 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <Rocket className="size-8" />
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
                {draft.businessName || 'Tu local'} está listo para vender
              </h2>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                Cargamos productos, clientes y ventas de ejemplo para que explores el sistema con datos reales.
                Podés resetearlos cuando quieras desde <strong>Herramientas</strong>.
              </p>
              <ul className="grid gap-2 text-left text-sm text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500" /> Rubro: {draft.category}</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500" /> {draft.enabledPaymentMethods.length} métodos de pago</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500" /> Descuento máx: {draft.maxDiscountPercent}%</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500" /> Caja obligatoria: {draft.requireOpenCashToSell ? 'sí' : 'no'}</li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="size-4" aria-hidden />
            Atrás
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Continuar
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button variant="success" size="lg" onClick={() => finish(false)}>
              <Rocket className="size-4" aria-hidden />
              Empezar a usar {APP_NAME}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
