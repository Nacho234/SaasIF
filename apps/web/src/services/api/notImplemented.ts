/**
 * Error que lanzan los stubs de la API de producción mientras el backend (Supabase)
 * no está conectado. Sirve como checklist: cada operación pendiente lo lanza con su nombre.
 */
export class NotImplementedError extends Error {
  constructor(operation: string) {
    super(`[modo prod] "${operation}" todavía no está implementado. Falta conectar el backend (ver docs/HANDOFF).`);
    this.name = 'NotImplementedError';
  }
}
