import type { ProcessorId, TerminalClosure } from '@/types';
import { useCashStore } from '@/store/cashStore';
import { useAuthStore } from '@/store/authStore';
import { generateId } from '@/utils/id';
import { round2 } from '@/utils/calc';
import { getRegisterSummary } from './cashRegisterService';
import { logAudit } from './auditService';

export function getTerminalClosures(registerId: string): TerminalClosure[] {
  return useCashStore.getState().terminalClosures.filter((t) => t.cashRegisterId === registerId);
}

export interface TerminalClosureInput {
  cashRegisterId: string;
  processor: ProcessorId;
  terminalLabel: string;
  batchNumber: string;
  closingNumber: string;
  /** Totales informados por la terminal (modo avanzado). */
  terminalDebit: number;
  terminalCredit: number;
  terminalQr: number;
  notes: string;
  /**
   * Modo simple: se confirma visualmente que la terminal coincide con el sistema.
   * Los totales de terminal se igualan a los del sistema (diferencia 0).
   */
  matchSystem?: boolean;
}

export function addTerminalClosure(input: TerminalClosureInput): { ok: boolean; error?: string; terminal?: TerminalClosure } {
  const user = useAuthStore.getState().user;
  if (!user) return { ok: false, error: 'No hay sesión activa.' };
  if (!input.terminalLabel.trim()) return { ok: false, error: 'Indicá la terminal (ej. Caja 1).' };

  // Totales del sistema para los medios electrónicos del turno.
  const summary = getRegisterSummary(input.cashRegisterId);
  const systemDebit = round2(summary.salesByMethod.debit_card ?? 0);
  const systemCredit = round2(summary.salesByMethod.credit_card ?? 0);
  const systemQr = round2(summary.salesByMethod.mercado_pago ?? 0);

  // En modo simple la terminal se da por coincidente con el sistema.
  const terminalDebit = input.matchSystem ? systemDebit : round2(input.terminalDebit);
  const terminalCredit = input.matchSystem ? systemCredit : round2(input.terminalCredit);
  const terminalQr = input.matchSystem ? systemQr : round2(input.terminalQr);

  const terminal: TerminalClosure = {
    id: generateId(),
    cashRegisterId: input.cashRegisterId,
    processor: input.processor,
    terminalLabel: input.terminalLabel.trim(),
    batchNumber: input.batchNumber.trim(),
    closingNumber: input.closingNumber.trim(),
    systemDebit,
    terminalDebit,
    debitDifference: round2(terminalDebit - systemDebit),
    systemCredit,
    terminalCredit,
    creditDifference: round2(terminalCredit - systemCredit),
    systemQr,
    terminalQr,
    qrDifference: round2(terminalQr - systemQr),
    totalSystem: round2(systemDebit + systemCredit + systemQr),
    totalTerminal: round2(terminalDebit + terminalCredit + terminalQr),
    totalDifference: round2(terminalDebit + terminalCredit + terminalQr - (systemDebit + systemCredit + systemQr)),
    notes: input.notes.trim(),
    createdById: user.id,
    createdByName: user.name,
    date: new Date().toISOString(),
  };

  useCashStore.getState().addTerminalClosure(terminal);
  logAudit({
    action: 'terminal_closed',
    module: 'cash',
    description: `Cargó cierre de terminal ${terminal.terminalLabel} (${terminal.processor})`,
    metadata: {
      terminal: terminal.terminalLabel,
      processor: terminal.processor,
      difference: terminal.totalDifference,
    },
  });
  return { ok: true, terminal };
}

export function removeTerminalClosure(id: string): void {
  useCashStore.getState().removeTerminalClosure(id);
}
