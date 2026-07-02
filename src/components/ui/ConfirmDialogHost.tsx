import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { Modal } from './Modal';
import { Button } from './Button';

/** Host global del diálogo de confirmación (se dispara con uiStore.askConfirm). */
export function ConfirmDialogHost() {
  const confirm = useUiStore((s) => s.confirm);
  const closeConfirm = useUiStore((s) => s.closeConfirm);

  if (!confirm) return null;

  return (
    <Modal open={confirm.open} onClose={closeConfirm} size="sm">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span
          className={
            confirm.danger
              ? 'rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-950 dark:text-red-400'
              : 'rounded-full bg-primary-100 p-3 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
          }
        >
          {confirm.danger ? <AlertTriangle className="size-6" /> : <HelpCircle className="size-6" />}
        </span>
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">{confirm.title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{confirm.message}</p>
        <div className="mt-2 flex w-full flex-col-reverse gap-2 sm:flex-row">
          <Button variant="secondary" fullWidth onClick={closeConfirm}>
            {confirm.cancelLabel ?? 'Cancelar'}
          </Button>
          <Button
            variant={confirm.danger ? 'danger' : 'primary'}
            fullWidth
            onClick={() => {
              confirm.onConfirm();
              closeConfirm();
            }}
          >
            {confirm.confirmLabel ?? 'Confirmar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
