import { useRef } from 'react';
import { Database, Download, FlaskConical, HardDriveDownload, HardDriveUpload, RotateCcw, Upload } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { useSalesStore } from '@/store/salesStore';
import { useCustomerStore } from '@/store/customerStore';
import { useAuditStore } from '@/store/auditStore';
import { resetDemoData } from '@/demo/demoDataService';
import { appStorageSizeKb, exportAllData, importAllData, listAppKeys } from '@/services/storageService';
import { logAudit } from '@/services/auditService';
import { toast, useUiStore } from '@/store/uiStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';

export function ToolsPage() {
  const askConfirm = useUiStore((s) => s.askConfirm);
  const products = useProductStore((s) => s.products.length);
  const sales = useSalesStore((s) => s.sales.length);
  const customers = useCustomerStore((s) => s.customers.length);
  const auditCount = useAuditStore((s) => s.logs.length);
  const fileRef = useRef<HTMLInputElement>(null);

  const simulateExport = (what: string) => {
    askConfirm({
      title: `Exportar ${what}`,
      message: `Se generará un archivo CSV con ${what} (simulado en la demo).`,
      confirmLabel: 'Exportar',
      onConfirm: () => {
        logAudit({ action: 'export', module: 'system', description: `Exportó ${what} (simulado)` });
        toast.success(`Exportación de ${what} simulada`, 'En la versión completa se descarga el CSV real.');
      },
    });
  };

  const simulateImport = (what: string) => {
    askConfirm({
      title: `Importar ${what}`,
      message: `Se importaría un archivo CSV de ${what} (simulado en la demo).`,
      confirmLabel: 'Importar',
      onConfirm: () => {
        logAudit({ action: 'import', module: 'system', description: `Importó ${what} (simulado)` });
        toast.success(`Importación de ${what} simulada`, 'En la versión completa se procesa el archivo real.');
      },
    });
  };

  const downloadBackup = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mostrador-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    logAudit({ action: 'backup_created', module: 'system', description: 'Descargó un backup local de los datos' });
    toast.success('Backup descargado', 'Guardalo para restaurar los datos cuando quieras.');
  };

  const restoreBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      askConfirm({
        title: 'Restaurar backup',
        message: 'Se reemplazan TODOS los datos actuales por los del archivo. La app se recargará.',
        confirmLabel: 'Restaurar',
        danger: true,
        onConfirm: () => {
          const result = importAllData(String(reader.result));
          if (result.ok) {
            toast.success('Backup restaurado', 'Recargando la aplicación…');
            setTimeout(() => window.location.reload(), 800);
          } else {
            toast.error('No se pudo restaurar', result.error);
          }
        },
      });
    };
    reader.readAsText(file);
  };

  const reset = () => {
    askConfirm({
      title: 'Resetear datos demo',
      message: 'Se borran todos los datos locales y se vuelve a cargar la demostración desde cero. Esta acción no se puede deshacer.',
      confirmLabel: 'Resetear todo',
      danger: true,
      onConfirm: () => {
        toast.info('Reseteando datos demo…');
        setTimeout(() => resetDemoData(), 600);
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Herramientas" subtitle="Estado de los datos locales, import/export y modo demo" />

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
        <FlaskConical className="mr-2 inline size-4" aria-hidden />
        Estás usando <strong>datos locales de demostración</strong>. Nada se envía a servidores externos: todo vive en este dispositivo.
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Productos" value={products} icon={Database} />
        <StatCard label="Ventas" value={sales} icon={Database} />
        <StatCard label="Clientes" value={customers} icon={Database} />
        <StatCard label="Eventos de auditoría" value={auditCount} icon={Database} />
        <StatCard label="Almacenamiento" value={`${appStorageSizeKb()} KB`} icon={Database} hint={`${listAppKeys().length} claves locales`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Exportar datos" subtitle="Simulado: muestra el flujo sin generar archivos reales" />
          <CardBody className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => simulateExport('productos')}>
              <Download className="size-4" aria-hidden /> Productos
            </Button>
            <Button variant="secondary" onClick={() => simulateExport('ventas')}>
              <Download className="size-4" aria-hidden /> Ventas
            </Button>
            <Button variant="secondary" onClick={() => simulateExport('clientes')}>
              <Download className="size-4" aria-hidden /> Clientes
            </Button>
            <Button variant="secondary" onClick={() => simulateExport('reportes')}>
              <Download className="size-4" aria-hidden /> Reportes
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Importar datos" subtitle="Simulado: CSV de productos y clientes" />
          <CardBody className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => simulateImport('productos (CSV)')}>
              <Upload className="size-4" aria-hidden /> Productos CSV
            </Button>
            <Button variant="secondary" onClick={() => simulateImport('clientes (CSV)')}>
              <Upload className="size-4" aria-hidden /> Clientes CSV
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Backup local" subtitle="Este sí es real: descarga y restaura el JSON con todos los datos" />
          <CardBody className="grid grid-cols-2 gap-2">
            <Button onClick={downloadBackup}>
              <HardDriveDownload className="size-4" aria-hidden /> Crear backup
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <HardDriveUpload className="size-4" aria-hidden /> Restaurar backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) restoreBackup(file);
                e.target.value = '';
              }}
            />
          </CardBody>
        </Card>

        <Card className="border-red-200 dark:border-red-900">
          <CardHeader title="Zona peligrosa" subtitle="Reinicia toda la demo con datos frescos" />
          <CardBody>
            <Button variant="danger" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden />
              Resetear datos demo
            </Button>
            <p className="mt-2 text-xs text-slate-400">
              Borra ventas, cajas, productos y configuración, y vuelve a generar el escenario de demostración.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
