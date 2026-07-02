import type { ThemeMode } from '@/types';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [15, 23, 42];

/**
 * Genera la escala primary-50..950 a partir del color elegido y la aplica
 * como variables CSS (pisan los valores por defecto de Tailwind @theme).
 */
export function applyPrimaryColor(hex: string): void {
  const base = hexToRgb(hex);
  const scale: Record<string, string> = {
    '50': mix(base, WHITE, 0.95),
    '100': mix(base, WHITE, 0.9),
    '200': mix(base, WHITE, 0.78),
    '300': mix(base, WHITE, 0.6),
    '400': mix(base, WHITE, 0.32),
    '500': mix(base, WHITE, 0.12),
    '600': `rgb(${base[0]} ${base[1]} ${base[2]})`,
    '700': mix(base, BLACK, 0.18),
    '800': mix(base, BLACK, 0.34),
    '900': mix(base, BLACK, 0.5),
    '950': mix(base, BLACK, 0.68),
  };
  const root = document.documentElement;
  for (const [step, value] of Object.entries(scale)) {
    root.style.setProperty(`--color-primary-${step}`, value);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', hex);
}

export function applyThemeMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function applyDensity(density: 'comfortable' | 'compact'): void {
  document.documentElement.dataset.density = density;
}
