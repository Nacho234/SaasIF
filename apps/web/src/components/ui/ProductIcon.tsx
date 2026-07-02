import {
  Bone,
  Cat,
  Dog,
  Package,
  Shirt,
  Sparkles,
  ToyBrick,
  Bed,
  Link2,
  UtensilsCrossed,
  Mountain,
  Gift,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'cat-ali-perro': Dog,
  'cat-ali-gato': Cat,
  'cat-snacks': Bone,
  'cat-juguetes': ToyBrick,
  'cat-higiene': Sparkles,
  'cat-accesorios': Shirt,
  'cat-camas': Bed,
  'cat-correas': Link2,
  'cat-comederos': UtensilsCrossed,
  'cat-arena': Mountain,
};

/** Imagen mock del producto: icono por categoría sobre color de la categoría. */
export function ProductIcon({
  categoryId,
  color,
  isCombo,
  size = 'md',
  className,
}: {
  categoryId?: string;
  color?: string;
  isCombo?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const Icon = isCombo ? Gift : (categoryId && CATEGORY_ICONS[categoryId]) || Package;
  const sizeClass = {
    sm: 'size-8 rounded-lg [&>svg]:size-4',
    md: 'size-10 rounded-xl [&>svg]:size-5',
    lg: 'size-12 rounded-xl [&>svg]:size-6',
    xl: 'size-20 rounded-2xl [&>svg]:size-9',
  }[size];
  const bg = color ?? '#64748b';
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center', sizeClass, className)}
      style={{ backgroundColor: `${bg}1f`, color: bg }}
    >
      <Icon />
    </span>
  );
}
