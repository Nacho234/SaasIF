import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** Sin decimales, para dashboards y cards. */
export function formatMoney(value: number): string {
  return compactFormatter.format(Math.round(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy', { locale: es });
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm', { locale: es });
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy HH:mm', { locale: es });
}

/** "Hoy 14:32", "Ayer 09:10" o "12/05/2026 18:00". */
export function formatFriendlyDateTime(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return `Hoy ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Ayer ${format(date, 'HH:mm')}`;
  return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
}

export function formatTimeAgo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es });
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
