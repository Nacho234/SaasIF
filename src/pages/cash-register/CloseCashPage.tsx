import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Banknote, CreditCard, Lock, Plus, ShieldCheck } from 'lucide-react';
import { useCashStore, selectOpenRegister } from '@/store/cashStore';
import { useBusinessStore } from '@/store/businessStore';
import { closeRegister, getRegisterSummary } from '@/services/cashRegisterService';
import { removeTerminalClosure } from '@/services/terminalClosureService';
import type { PaymentMethodId, PaymentMethodVerification } from '@/types';
import { toast, useUiStore } from '@/store/uiStore';
import { ROUTES } from '@/constants/routes';
import { PAYMENT_METHOD_LABELS } from '@/constants/paymentMethods';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { CashDifferenceAlert } from '@/components/cash/CashDifferenceAlert';
import { TerminalClosureForm } from '@/components/cash/TerminalClosureForm';
import { TerminalClosureSummary } from '@/components/cash/TerminalClosureSummary';
import { formatCurrency, formatMoney } from '@/utils/format';
import { round2 } from '@/utils/calc';
import { cn } from '@/utils/cn';

const STEPS = [
  { n: 1, label: 'Resumen' },
  { n: 2, label: 'Arqueo' },
  { n: 3, label: 'Medios' },
  { n: 4, label: 'Terminales' },
  { n: 5, label: 'Confirmar' },
];

export function CloseCashPage() {
  const navigate = useNavigate();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const register = useCashStore((s) => selectOpenRegister(s));
  const movements = useCashStore((s) => s.movements);
  const terminalClosures = useCashStore((s) => s.terminalClosures);
  const settings = useBusinessStore((s) => s.settings);

  const [step, setStep] = useState(1);
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [verifs, setVerifs] = useState<Record<string, { verified: boolean; note: string }>>({});
  const [employeeSignature, setEmployeeSignature] = useState('');
  const [managerSignature, setManagerSignature] = useState('');
  const [terminalForm, setTerminalForm] = useState(false);
  const [error, setError] = useState('');

  const summary = useMemo(() => (register ? getRegisterSummary(register.id) : null), [register, movements]);
  const terminals = useMemo(
    () => terminalClosures.filter((t) => register && t.cashRegisterId === register.id),
    [terminalClosures, register],
  );

  if (!register || !summary) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Cerrar caja" backTo={ROUTES.cash} />
        <Card>
          <EmptyState
            icon={Banknote}
            title="No hay ninguna caja abierta"
            description="Abrí una caja para poder cerrarla."
            action={<Button onClick={() => navigate(ROUTES.cash)}>Ir a Caja</Button>}
          />
        </Card>
      </div>
    );
  }

  const countedValue = counted === '' ? null : Number(counted);
  const difference =
    countedValue != null && !Number.isNaN(countedValue) ? round2(countedValue - summary.expectedCash) : null;

  // Medios electrónicos con ventas en el turno (para verificar).
  const electronicMethods = (Object.keys(summary.salesByMethod) as PaymentMethodId[]).filter((m) => m !== 'cash');

  const toggleVerif = (method: string, verified: boolean) =>
    setVerifs((v) => ({ ...v, [method]: { verified, note: v[method]?.note ?? '' } }));

  const canNext = () => {
    if (step === 2) {
      if (settings.requireCashCount && (countedValue == null || Number.isNaN(countedValue))) return false;
      if (difference !== 0 && difference != null && settings.requireNoteOnCashDifference && !notes.trim()) return false;
      if (difference !== 0 && difference != null && !settings.allowCloseWithDifference) return false;
    }
    if (step === 4 && settings.requireTerminalClosure && terminals.length === 0) return false;
    return true;
  };

  const confirm = () => {
    setError('');
    const verifications: PaymentMethodVerification[] = electronicMethods.map((m) => ({
      method: m,
      systemAmount: round2(summary.salesByMethod[m] ?? 0),
      verified: verifs[m]?.verified ?? false,
      note: verifs[m]?.note ?? '',
    }));
    askConfirm({
      title: 'Confirmar cierre de caja',
      message:
        difference === 0
          ? 'El arqueo coincide. Se generará la hoja de cierre. ¿Confirmás?'
          : `Hay una diferencia de ${formatCurrency(difference ?? 0)}. Se registrará en la hoja de cierre. ¿Confirmás?`,
      confirmLabel: 'Cerrar caja',
      danger: difference !== 0,
      onConfirm: () => {
        const result = closeRegister({
          countedCash: countedValue,
          notes,
          paymentVerifications: verifications,
          employeeSignature: employeeSignature || null,
          managerSignature: managerSignature || null,
        });
        if (result.ok && result.register) {
          toast.success('Caja cerrada', 'Hoja de cierre generada.');
          navigate(ROUTES.cashClosure(result.register.id));
        } else {
          setError(result.error ?? 'No se pudo cerrar la caja.');
          setStep(2);
        }
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader title={`Cerrar caja ${register.number}`} subtitle="Arqueo, verificación de medios y hoja de cierre" backTo={ROUTES.cash} />

      {/* Stepper */}
      <div className="mb-5 flex items-center gap-1 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1">
            <div
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                step === s.n
                  ? 'bg-primary-600 text-white'
                  : step > s.n
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800',
              )}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-black/10 text-[10px]">
                {step > s.n ? '✓' : s.n}
              </span>
              {s.label}
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-3 bg-slate-200 dark:bg-slate-700" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Paso 1 — Resumen */}
      {step === 1 && (
        <Card>
          <CardHeader title="Resumen del turno" subtitle="Movimientos calculados automáticamente" />
          <CardBody className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500">Ventas del turno</p>
                <p className="font-display text-lg font-bold tabular-nums">
                  {summary.salesCount} ventas · {formatCurrency(summary.salesTotal)}
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
                  {electronicMethods.length + (summary.salesByMethod.cash ? 1 : 0) === 0 && <li>Sin ventas todavía.</li>}
                  {Object.entries(summary.salesByMethod).map(([method, amount]) => (
                    <li key={method} className="flex justify-between">
                      <span>{PAYMENT_METHOD_LABELS[method as PaymentMethodId]}</span>
                      <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500">Movimientos</p>
                <ul className="mt-1 flex flex-col gap-1 text-xs text-slate-500">
                  <li className="flex justify-between"><span>Monto inicial</span><span className="tabular-nums">{formatCurrency(register.openingAmount)}</span></li>
                  <li className="flex justify-between"><span>Ingresos manuales</span><span className="tabular-nums">{formatCurrency(summary.manualIncome)}</span></li>
                  <li className="flex justify-between"><span>Pagos de deuda</span><span className="tabular-nums">{formatCurrency(summary.debtPayments)}</span></li>
                  <li className="flex justify-between text-red-600 dark:text-red-400"><span>Gastos y egresos</span><span className="tabular-nums">-{formatCurrency(summary.expensesTotal)}</span></li>
                  <li className="flex justify-between text-red-600 dark:text-red-400"><span>Retiros</span><span className="tabular-nums">-{formatCurrency(summary.withdrawals)}</span></li>
                  <li className="flex justify-between text-red-600 dark:text-red-400"><span>Devoluciones y anulaciones</span><span className="tabular-nums">-{formatCurrency(round2(summary.refunds + summary.cancellations))}</span></li>
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3 dark:bg-primary-950">
              <span className="text-sm font-medium text-primary-900 dark:text-primary-200">Efectivo esperado en el cajón</span>
              <span className="font-display text-xl font-bold text-primary-900 tabular-nums dark:text-primary-100">{formatCurrency(summary.expectedCash)}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Paso 2 — Arqueo */}
      {step === 2 && (
        <Card>
          <CardHeader title="Arqueo de efectivo" subtitle="Contá el efectivo real del cajón" />
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <span className="text-sm text-slate-500">Efectivo esperado</span>
              <span className="font-display text-lg font-bold tabular-nums">{formatCurrency(summary.expectedCash)}</span>
            </div>
            <Input
              label="Efectivo contado"
              required={settings.requireCashCount}
              type="number"
              min={0}
              inputMode="decimal"
              value={counted}
              onChange={(e) => {
                setCounted(e.target.value);
                setError('');
              }}
              leftIcon={<span className="text-sm font-semibold">$</span>}
              placeholder="Contá el efectivo real"
              autoFocus
            />
            <CashDifferenceAlert difference={difference} />
            {difference !== 0 && difference != null && !settings.allowCloseWithDifference && (
              <p className="text-sm font-medium text-red-600">La configuración no permite cerrar con diferencia. Revisá el conteo.</p>
            )}
            <Textarea
              label={difference !== 0 && difference != null ? 'Observaciones (obligatorio por la diferencia)' : 'Observaciones'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: se pagó un flete en efectivo sin registrar"
              rows={2}
            />
          </CardBody>
        </Card>
      )}

      {/* Paso 3 — Verificación de medios */}
      {step === 3 && (
        <Card>
          <CardHeader title="Verificación de medios de pago" subtitle="Marcá los medios electrónicos que ya verificaste" />
          <CardBody className="flex flex-col gap-3">
            {electronicMethods.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No hubo cobros electrónicos en este turno.</p>
            ) : (
              electronicMethods.map((m) => (
                <div key={m} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-semibold">{PAYMENT_METHOD_LABELS[m]}</p>
                    <p className="text-xs text-slate-500 tabular-nums">Sistema: {formatCurrency(summary.salesByMethod[m] ?? 0)}</p>
                  </div>
                  <Switch
                    checked={verifs[m]?.verified ?? false}
                    onChange={(v) => toggleVerif(m, v)}
                    label={verifs[m]?.verified ? 'Verificado' : 'Sin verificar'}
                  />
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* Paso 4 — Cierre de terminales */}
      {step === 4 && (
        <Card>
          <CardHeader
            title="Cierre de terminales"
            subtitle={settings.requireTerminalClosure ? 'Obligatorio por configuración' : 'Opcional: cargá las terminales que quieras conciliar'}
            action={
              <Button size="sm" variant="secondary" onClick={() => setTerminalForm(true)}>
                <Plus className="size-4" aria-hidden />
                Agregar terminal
              </Button>
            }
          />
          <CardBody className="flex flex-col gap-3">
            {terminals.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Sin terminales cargadas"
                description={
                  settings.requireTerminalClosure
                    ? 'Cargá al menos una terminal para poder cerrar la caja.'
                    : 'Podés continuar sin cargar terminales, o agregarlas para conciliar.'
                }
                className="py-6"
              />
            ) : (
              terminals.map((t) => (
                <TerminalClosureSummary key={t.id} terminal={t} onRemove={() => removeTerminalClosure(t.id)} />
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* Paso 5 — Confirmación */}
      {step === 5 && (
        <Card>
          <CardHeader title="Confirmación final" subtitle="Revisá antes de cerrar" />
          <CardBody className="flex flex-col gap-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"><dt className="text-slate-500">Total ventas</dt><dd className="font-bold tabular-nums">{formatMoney(summary.salesTotal)}</dd></div>
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"><dt className="text-slate-500">Efectivo esperado</dt><dd className="font-bold tabular-nums">{formatMoney(summary.expectedCash)}</dd></div>
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"><dt className="text-slate-500">Efectivo contado</dt><dd className="font-bold tabular-nums">{countedValue != null ? formatMoney(countedValue) : '—'}</dd></div>
              <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"><dt className="text-slate-500">Diferencia</dt><dd className={cn('font-bold tabular-nums', difference === 0 ? 'text-emerald-600' : 'text-amber-600')}>{difference != null ? formatCurrency(difference) : '—'}</dd></div>
            </dl>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="size-4 text-slate-400" aria-hidden />
              {terminals.length} terminal(es) · {electronicMethods.filter((m) => verifs[m]?.verified).length}/{electronicMethods.length} medios verificados
            </div>

            {(settings.requireEmployeeSignature || settings.requireManagerSignature) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {settings.requireEmployeeSignature && (
                  <Input label="Firma del empleado" required value={employeeSignature} onChange={(e) => setEmployeeSignature(e.target.value)} placeholder="Nombre y apellido" />
                )}
                {settings.requireManagerSignature && (
                  <Input label="Firma del encargado" required value={managerSignature} onChange={(e) => setManagerSignature(e.target.value)} placeholder="Nombre y apellido" />
                )}
              </div>
            )}

            <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Una vez cerrada, la caja queda bloqueada. Solo un administrador puede reabrirla (queda auditado).
            </div>
          </CardBody>
        </Card>
      )}

      {/* Navegación */}
      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => (step === 1 ? navigate(ROUTES.cash) : setStep((s) => s - 1))}>
          <ArrowLeft className="size-4" aria-hidden />
          {step === 1 ? 'Cancelar' : 'Atrás'}
        </Button>
        {step < 5 ? (
          <Button
            onClick={() => {
              if (!canNext()) {
                setError(
                  step === 2
                    ? 'Completá el arqueo (y la observación si hay diferencia) para continuar.'
                    : 'Cargá al menos una terminal: es obligatorio por configuración.',
                );
                return;
              }
              setError('');
              setStep((s) => s + 1);
            }}
          >
            Continuar
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button variant="danger" onClick={confirm}>
            <Lock className="size-4" aria-hidden />
            Confirmar cierre de caja
          </Button>
        )}
      </div>

      <TerminalClosureForm
        open={terminalForm}
        onClose={() => setTerminalForm(false)}
        registerId={register.id}
        advanced={settings.terminalClosureMode === 'advanced'}
      />
    </div>
  );
}
