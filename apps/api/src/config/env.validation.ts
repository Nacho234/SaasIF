/**
 * Validación mínima de variables de entorno al arrancar. Si falta algo crítico,
 * el backend no levanta (mejor fallar temprano que a mitad de una request).
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}. Ver apps/api/.env.example`);
  }
  return config;
}
