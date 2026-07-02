import type { NotificationType, Product } from '@/types';
import { useNotificationStore } from '@/store/notificationStore';
import { useBusinessStore } from '@/store/businessStore';
import { generateId } from '@/utils/id';
import { ROUTES } from '@/constants/routes';

interface PushInput {
  title: string;
  description: string;
  type: NotificationType;
  actionUrl?: string | null;
}

export function pushNotification(input: PushInput): void {
  const { notifications, addNotification } = useNotificationStore.getState();
  // Evita duplicar notificaciones no leídas con el mismo título.
  if (notifications.some((n) => !n.read && n.title === input.title)) return;
  addNotification({
    id: generateId(),
    title: input.title,
    description: input.description,
    type: input.type,
    read: false,
    date: new Date().toISOString(),
    actionUrl: input.actionUrl ?? null,
  });
}

/** Genera alertas de bajo stock / sin stock después de un cambio de inventario. */
export function checkStockAlerts(product: Product): void {
  const { settings } = useBusinessStore.getState();
  if (product.stock <= 0 && settings.outOfStockAlerts) {
    pushNotification({
      title: `Sin stock: ${product.name}`,
      description: 'El producto se quedó sin stock. Considerá reponerlo.',
      type: 'out_of_stock',
      actionUrl: ROUTES.productDetail(product.id),
    });
  } else if (product.stock <= product.minStock && settings.lowStockAlerts) {
    pushNotification({
      title: `Bajo stock: ${product.name}`,
      description: `Quedan ${product.stock} unidades (mínimo: ${product.minStock}).`,
      type: 'low_stock',
      actionUrl: ROUTES.productDetail(product.id),
    });
  }
}
