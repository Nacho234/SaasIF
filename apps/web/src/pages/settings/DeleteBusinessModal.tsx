import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { isProdMode } from '@/config/appMode';
import { deleteBusinessApi } from '@/services/api/businessApiService';
import { ApiError } from '@/services/api/apiClient';
import { logout } from '@/services/authService';
import { clearAllAppStorage } from '@/services/storageService';
import { toast } from '@/store/uiStore';
import { ROUTES } from '@/constants/routes';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const CONFIRM_WORD = 'ELIMINAR';

export function DeleteBusinessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canDelete = confirmation === CONFIRM_WORD && (!isProdMode || password.length > 0);

  const submit = async () => {
    if (!canDelete) return;
    setError('');
    setLoading(true);
    try {
      if (isProdMode) {
        await deleteBusinessApi(password, confirmation);
      } else {
        // Modo demo: no hay backend, se reinician los datos locales.
        clearAllAppStorage();
      }
      toast.success('Negocio eliminado', 'Se borraron todos los datos.');
      logout();
      // Reinicia la app en un estado limpio.
      setTimeout(() => {
        window.location.href = ROUTES.login;
      }, 400);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el negocio.');
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar negocio"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submit} disabled={!canDelete} loading={loading}>
            <Trash2 className="size-4" aria-hidden />
            Eliminar definitivamente
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950/50">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" aria-hidden />
          <p className="text-sm text-red-800 dark:text-red-300">
            Esta acción es <strong>irreversible</strong>. Se eliminan el negocio y <strong>todos</strong> sus
            datos: productos, clientes, ventas, caja, usuarios y configuración. No se puede deshacer.
          </p>
        </div>

        <Input
          label={`Escribí ${CONFIRM_WORD} para confirmar`}
          value={confirmation}
          onChange={(e) => {
            setConfirmation(e.target.value.toUpperCase());
            setError('');
          }}
          placeholder={CONFIRM_WORD}
          autoFocus
        />

        {isProdMode && (
          <Input
            label="Ingresá tu contraseña"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
          />
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
