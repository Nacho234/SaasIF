import type { CashClosure, CashMovement, CashRegister, TerminalClosure } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useCashStore } from '@/store/cashStore';
import { supabase } from './supabaseClient';
import { toast } from '@/store/uiStore';

/**
 * Caja en modo prod: el store local sigue siendo la caché reactiva (UI instantánea + toda la
 * lógica de cierre/terminales de Nico intacta). Acá:
 *  - loadCash(): rellena el store desde Supabase al entrar.
 *  - mirror*(): espejan cada escritura del store a Supabase (fire-and-forget, con toast si falla).
 * Los ids se conservan (el store genera el id y lo insertamos igual) para que store y DB coincidan.
 */

function biz(): string {
  return useAuthStore.getState().businessId ?? '';
}

const n = (v: unknown): number => Number(v ?? 0);
const nn = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

// --- Mappers DB → frontend ---
function toRegister(r: Record<string, unknown>): CashRegister {
  return {
    id: r.id as string,
    number: (r.number as string) ?? '',
    openedAt: (r.openedAt as string) ?? new Date().toISOString(),
    closedAt: (r.closedAt as string) ?? null,
    openedById: (r.openedById as string) ?? '',
    openedByName: (r.openedByName as string) ?? '',
    closedById: (r.closedById as string) ?? null,
    closedByName: (r.closedByName as string) ?? null,
    openingAmount: n(r.openingAmount),
    expectedCash: nn(r.expectedCash),
    countedCash: nn(r.countedCash),
    difference: nn(r.difference),
    status: (r.status as CashRegister['status']) ?? 'open',
    openingNotes: (r.openingNotes as string) ?? '',
    closingNotes: (r.closingNotes as string) ?? '',
  };
}
function toMovement(m: Record<string, unknown>): CashMovement {
  return {
    id: m.id as string,
    cashRegisterId: m.cashRegisterId as string,
    type: m.type as CashMovement['type'],
    direction: m.direction as 'in' | 'out',
    amount: n(m.amount),
    method: m.method as CashMovement['method'],
    reason: (m.reason as string) ?? '',
    userId: (m.userId as string) ?? '',
    userName: (m.userName as string) ?? '',
    relatedSaleId: (m.relatedSaleId as string) ?? null,
    date: (m.date as string) ?? new Date().toISOString(),
    notes: (m.notes as string) ?? '',
  };
}
function toClosure(c: Record<string, unknown>): CashClosure {
  return { ...(c as unknown as CashClosure) };
}
function toTerminal(t: Record<string, unknown>): TerminalClosure {
  return {
    ...(t as unknown as TerminalClosure),
    systemDebit: n(t.systemDebit), terminalDebit: n(t.terminalDebit), debitDifference: n(t.debitDifference),
    systemCredit: n(t.systemCredit), terminalCredit: n(t.terminalCredit), creditDifference: n(t.creditDifference),
    systemQr: n(t.systemQr), terminalQr: n(t.terminalQr), qrDifference: n(t.qrDifference),
    totalSystem: n(t.totalSystem), totalTerminal: n(t.totalTerminal), totalDifference: n(t.totalDifference),
  };
}

/** Rellena el store de caja desde Supabase (solo prod). */
export async function loadCash(): Promise<void> {
  if (!biz()) return;
  const [reg, mov, clo, term] = await Promise.all([
    supabase.from('cash_registers').select('*').order('openedAt', { ascending: false }),
    supabase.from('cash_movements').select('*').order('date', { ascending: false }),
    supabase.from('cash_closures').select('*').order('createdAt', { ascending: false }),
    supabase.from('terminal_closures').select('*'),
  ]);
  useCashStore.getState().replaceAll({
    registers: (reg.data ?? []).map(toRegister),
    movements: (mov.data ?? []).map(toMovement),
    closures: (clo.data ?? []).map(toClosure),
    terminalClosures: (term.data ?? []).map(toTerminal),
  });
}

function mirror(promise: PromiseLike<{ error: unknown }>, what: string): void {
  void Promise.resolve(promise).then(({ error }) => {
    if (error) toast.error('No se pudo sincronizar la caja', `Fallo al guardar ${what} en el servidor.`);
  });
}

// --- Espejos de escritura (prod) ---
export function mirrorRegister(r: CashRegister): void {
  mirror(
    supabase.from('cash_registers').upsert({
      id: r.id, businessId: biz(), number: r.number, openedAt: r.openedAt, closedAt: r.closedAt,
      openedById: r.openedById, openedByName: r.openedByName, closedById: r.closedById, closedByName: r.closedByName,
      openingAmount: r.openingAmount, expectedCash: r.expectedCash, countedCash: r.countedCash, difference: r.difference,
      status: r.status, openingNotes: r.openingNotes, closingNotes: r.closingNotes,
    }),
    'la caja',
  );
}
export function mirrorMovement(m: CashMovement): void {
  mirror(
    supabase.from('cash_movements').insert({
      id: m.id, businessId: biz(), cashRegisterId: m.cashRegisterId, type: m.type, direction: m.direction,
      amount: m.amount, method: m.method, reason: m.reason, userId: m.userId, userName: m.userName,
      relatedSaleId: m.relatedSaleId, date: m.date, notes: m.notes,
    }),
    'el movimiento',
  );
}
export function mirrorClosure(c: CashClosure): void {
  mirror(supabase.from('cash_closures').insert({ ...c, businessId: biz() }), 'el cierre');
}
export function mirrorTerminalClosure(t: TerminalClosure): void {
  mirror(supabase.from('terminal_closures').insert({ ...t, businessId: biz() }), 'el cierre de terminal');
}
