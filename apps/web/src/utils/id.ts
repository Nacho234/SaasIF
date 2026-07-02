export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pad(n: number, width = 5): string {
  return String(n).padStart(width, '0');
}

export function generateSaleNumber(counter: number): string {
  return `V-${pad(counter)}`;
}

export function generateCashNumber(counter: number): string {
  return `CJ-${pad(counter, 4)}`;
}

export function generatePurchaseNumber(counter: number): string {
  return `OC-${pad(counter, 4)}`;
}
