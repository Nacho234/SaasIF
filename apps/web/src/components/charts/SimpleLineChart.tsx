import { useId, useState } from 'react';
import { formatMoney } from '@/utils/format';

export interface LinePoint {
  label: string;
  value: number;
}

/** Gráfico de área/línea SVG sin dependencias. */
export function SimpleLineChart({
  data,
  height = 180,
  formatValue = formatMoney,
}: {
  data: LinePoint[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  if (data.length === 0) return null;

  const width = 600;
  const padX = 8;
  const padY = 14;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - d.value / max) * (height - padY * 2),
    ...d,
  }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${path} L${points[points.length - 1]!.x},${height} L${points[0]!.x},${height} Z`;
  const activePoint = active != null ? points[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Serie de ${data.length} puntos, máximo ${formatValue(max)}`}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary-500)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={width - padX}
            y1={padY + f * (height - padY * 2)}
            y2={padY + f * (height - padY * 2)}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke="var(--color-primary-600)" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={active === i ? 5 : 3}
              fill="var(--color-primary-600)"
              stroke="white"
              strokeWidth="1.5"
            />
            {/* Zona interactiva por punto */}
            <rect
              x={p.x - stepX / 2}
              y={0}
              width={Math.max(stepX, 20)}
              height={height}
              fill="transparent"
              onMouseEnter={() => setActive(i)}
            />
          </g>
        ))}
      </svg>
      {activePoint && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-pop dark:bg-slate-700"
          style={{ left: `${(activePoint.x / width) * 100}%` }}
        >
          {activePoint.label}: {formatValue(activePoint.value)}
        </div>
      )}
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{data[0]!.label}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]!.label}</span>}
        <span>{data[data.length - 1]!.label}</span>
      </div>
    </div>
  );
}
