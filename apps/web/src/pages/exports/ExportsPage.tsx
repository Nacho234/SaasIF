import { Download, FileSpreadsheet } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useSalesStore } from '@/store/salesStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSupplierStore } from '@/store/supplierStore';
import { useCashStore } from '@/store/cashStore';
import { useAuditStore } from '@/store/auditStore';
import { downloadCsv } from '@/utils/exportCsv';
import { logAudit } from '@/services/auditService';
import { toast } from '@/store/uiStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ExportDef {
  key: string;
  label: string;
  description: string;
  rows: () => Record<string, unknown>[];
}

export function ExportsPage() {
  const today = new Date().toISOString().slice(0, 10);

  const defs: ExportDef[] = [
    {
      key: 'ventas',
      label: 'Ventas',
      description: 'Todas las ventas con total, cliente, medio y estado.',
      rows: () =>
        useSalesStore.getState().sales.map((s) => ({
          numero: s.saleNumber,
          fecha: s.date,
          cliente: s.customerName ?? '',
          vendedor: s.sellerName,
          items: s.items.length,
          subtotal: s.subtotal,
          descuento: s.discountTotal,
          total: s.total,
          metodos: s.payments.map((p) => p.method).join(' + '),
          estado: s.status,
        })),
    },
    {
      key: 'productos',
      label: 'Productos',
      description: 'Catálogo con precios, costo y stock.',
      rows: () => {
        const cats = useProductStore.getState().categories;
        return useProductStore.getState().products.map((p) => ({
          sku: p.sku,
          nombre: p.name,
          categoria: cats.find((c) => c.id === p.categoryId)?.name ?? '',
          costo: p.costPrice,
          precio: p.salePrice,
          stock: p.stock,
          stock_minimo: p.minStock,
          activo: p.isActive ? 'sí' : 'no',
        }));
      },
    },
    {
      key: 'clientes',
      label: 'Clientes',
      description: 'Clientes con contacto y saldo de cuenta corriente.',
      rows: () =>
        useCustomerStore.getState().customers.map((c) => ({
          nombre: c.name,
          telefono: c.phone,
          email: c.email,
          dni: c.document,
          cuit: c.cuit,
          deuda: c.debtBalance,
          activo: c.isActive ? 'sí' : 'no',
        })),
    },
    {
      key: 'inventario',
      label: 'Movimientos de stock',
      description: 'Kardex: ingresos, egresos y ajustes.',
      rows: () =>
        useInventoryStore.getState().movements.map((m) => ({
          fecha: m.date,
          producto: m.productName,
          tipo: m.type,
          cantidad: m.quantity,
          stock_previo: m.previousStock,
          stock_nuevo: m.newStock,
          motivo: m.reason,
          usuario: m.userName,
        })),
    },
    {
      key: 'compras',
      label: 'Compras',
      description: 'Órdenes de compra a proveedores.',
      rows: () =>
        useSupplierStore.getState().purchases.map((p) => ({
          numero: p.number,
          fecha: p.date,
          proveedor: p.supplierName,
          items: p.items.length,
          total: p.total,
          estado: p.status,
        })),
    },
    {
      key: 'proveedores',
      label: 'Proveedores',
      description: 'Listado de proveedores.',
      rows: () =>
        useSupplierStore.getState().suppliers.map((s) => ({
          nombre: s.name,
          telefono: s.phone,
          email: s.email,
          cuit: s.cuit,
          contacto: s.contactName,
          activo: s.isActive ? 'sí' : 'no',
        })),
    },
    {
      key: 'cierres',
      label: 'Cierres de caja',
      description: 'Historial de cierres con arqueo y diferencia.',
      rows: () =>
        useCashStore.getState().closures.map((c) => ({
          caja: c.registerNumber,
          apertura: c.openedAt,
          cierre: c.closedAt,
          efectivo_esperado: c.expectedCash,
          efectivo_contado: c.countedCash,
          diferencia: c.cashDifference,
          total_ventas: c.salesTotal,
          estado: c.status,
        })),
    },
    {
      key: 'auditoria',
      label: 'Auditoría',
      description: 'Registro de acciones del sistema.',
      rows: () =>
        useAuditStore.getState().logs.map((l) => ({
          fecha: l.date,
          usuario: l.userName,
          modulo: l.module,
          accion: l.action,
          descripcion: l.description,
          severidad: l.severity,
        })),
    },
  ];

  const run = (def: ExportDef) => {
    const rows = def.rows();
    if (rows.length === 0) {
      toast.error('Nada para exportar', `No hay datos de ${def.label.toLowerCase()}.`);
      return;
    }
    downloadCsv(`${def.key}-${today}`, rows);
    logAudit({ action: 'data_exported', module: 'settings', description: `Exportó ${def.label} (${rows.length} filas)`, metadata: { dataset: def.key, rows: rows.length } });
    toast.success('Exportado', `${def.label}: ${rows.length} filas descargadas.`);
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <PageHeader title="Exportaciones" subtitle="Descargá tus datos en CSV (se abren en Excel)" />
      <div className="grid gap-3 sm:grid-cols-2">
        {defs.map((def) => (
          <Card key={def.key} className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950">
                <FileSpreadsheet className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{def.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{def.description}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => run(def)}>
              <Download className="size-4" aria-hidden />
              CSV
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
