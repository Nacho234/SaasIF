import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, Package, Pencil, Plus, Power, Truck } from 'lucide-react';
import { useSupplierStore } from '@/store/supplierStore';
import { useProductStore } from '@/store/productStore';
import { isProdMode } from '@/config/appMode';
import { mirrorSupplier } from '@/services/supabase/supabaseSuppliersService';
import { logAudit } from '@/services/auditService';
import { toast, useUiStore } from '@/store/uiStore';
import { formatMoney, formatFriendlyDateTime } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PurchaseStatusBadge, StockBadge } from '@/components/ui/StatusBadge';
import { SupplierFormModal } from './SuppliersPage';

export function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const supplier = useSupplierStore((s) => s.suppliers.find((x) => x.id === id));
  const allPurchases = useSupplierStore((s) => s.purchases);
  const updateSupplier = useSupplierStore((s) => s.updateSupplier);
  const allProducts = useProductStore((s) => s.products);
  const purchases = allPurchases.filter((p) => p.supplierId === id);
  const products = allProducts.filter((p) => p.supplierId === id);
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [editOpen, setEditOpen] = useState(false);

  if (!supplier) {
    return (
      <EmptyState
        icon={Truck}
        title="Proveedor no encontrado"
        action={<Button onClick={() => navigate(ROUTES.suppliers)}>Volver a proveedores</Button>}
      />
    );
  }

  const received = purchases.filter((p) => p.status === 'received');
  const totalBought = received.reduce((acc, p) => acc + p.total, 0);
  const lastPurchase = purchases[0]?.date ?? null;

  const toggleActive = () => {
    askConfirm({
      title: supplier.isActive ? 'Desactivar proveedor' : 'Reactivar proveedor',
      message: supplier.isActive ? 'No aparecerá al crear productos ni compras.' : 'Volverá a estar disponible.',
      danger: supplier.isActive,
      confirmLabel: supplier.isActive ? 'Desactivar' : 'Reactivar',
      onConfirm: () => {
        updateSupplier(supplier.id, { isActive: !supplier.isActive });
        if (isProdMode) mirrorSupplier({ ...supplier, isActive: !supplier.isActive });
        toast.success(supplier.isActive ? 'Proveedor desactivado' : 'Proveedor reactivado');
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {supplier.name}
            {!supplier.isActive && <Badge variant="outline">Inactivo</Badge>}
          </span>
        }
        subtitle={[supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(' · ')}
        backTo={ROUTES.suppliers}
        actions={
          <>
            <Button variant="secondary" onClick={toggleActive}>
              <Power className="size-4" aria-hidden />
              {supplier.isActive ? 'Desactivar' : 'Reactivar'}
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden />
              Editar
            </Button>
            <Link to={`${ROUTES.purchaseCreate}?supplierId=${supplier.id}`}>
              <Button>
                <Plus className="size-4" aria-hidden />
                Nueva compra
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Total comprado" value={formatMoney(totalBought)} icon={ClipboardList} tone="primary" hint={`${received.length} compras recibidas`} />
        <StatCard label="Productos asociados" value={products.length} icon={Package} />
        <StatCard label="Última compra" value={lastPurchase ? formatFriendlyDateTime(lastPurchase) : '—'} icon={Truck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Datos" />
          <CardBody>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">CUIT</dt><dd className="font-medium">{supplier.cuit || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Dirección</dt><dd className="font-medium">{supplier.address || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Contacto</dt><dd className="font-medium">{supplier.contactName || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Alta</dt><dd className="text-xs">{formatFriendlyDateTime(supplier.createdAt)}</dd></div>
            </dl>
            {supplier.notes && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{supplier.notes}</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Compras" subtitle={`${purchases.length} órdenes`} />
          <CardBody className="px-2">
            {purchases.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Sin compras" className="py-6" />
            ) : (
              <ul className="flex flex-col">
                {purchases.map((p) => (
                  <li key={p.id}>
                    <Link to={ROUTES.purchaseDetail(p.id)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <span>
                        <span className="block text-sm font-semibold">{p.number}</span>
                        <span className="block text-xs text-slate-400">{formatFriendlyDateTime(p.date)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <PurchaseStatusBadge status={p.status} />
                        <span className="font-bold tabular-nums">{formatMoney(p.total)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Productos de este proveedor" />
        <CardBody className="px-2">
          {products.length === 0 ? (
            <EmptyState icon={Package} title="Sin productos asociados" className="py-6" />
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {products.map((p) => (
                <li key={p.id}>
                  <Link to={ROUTES.productDetail(p.id)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <StockBadge stock={p.stock} minStock={p.minStock} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <SupplierFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={supplier}
        onSaved={() => {
          logAudit({ action: 'supplier_updated', module: 'suppliers', description: `Editó el proveedor "${supplier.name}"` });
          toast.success('Proveedor actualizado');
        }}
      />
    </div>
  );
}
