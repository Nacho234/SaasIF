/**
 * Error de API con status + código. Lo usan los servicios de datos (productos, clientes,
 * negocio) para tirar errores tipados que las pantallas muestran. (El HTTP real ahora lo
 * maneja supabase-js; ya no hay un fetch propio contra un backend.)
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
