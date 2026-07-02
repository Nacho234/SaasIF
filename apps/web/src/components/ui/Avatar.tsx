import { initials } from '@/utils/format';
import { cn } from '@/utils/cn';

export function Avatar({
  name,
  color,
  size = 'md',
  className,
}: {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = { sm: 'size-7 text-[10px]', md: 'size-9 text-xs', lg: 'size-12 text-sm' }[size];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none',
        sizeClass,
        className,
      )}
      style={{ backgroundColor: color ?? '#64748b' }}
    >
      {initials(name)}
    </span>
  );
}
