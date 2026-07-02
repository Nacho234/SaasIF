/**
 * Modo de la aplicación.
 *
 * - `demo`: usa datos falsos locales (mocks + localStorage). Es el modo actual y el que
 *   se muestra en la landing / para probar sin cuenta. Siembra el escenario de demostración.
 * - `prod`: usará el backend real (Supabase). NO debe sembrar datos falsos ni depender de mocks.
 *
 * Se controla con la variable de entorno `VITE_APP_MODE`. Por defecto: `demo`.
 * La migración a `prod` se completa en fases posteriores (ver docs/HANDOFF-arquitectura-produccion.md).
 */
export type AppMode = 'demo' | 'prod';

export const APP_MODE: AppMode = import.meta.env.VITE_APP_MODE === 'prod' ? 'prod' : 'demo';

export const isDemoMode = APP_MODE === 'demo';
export const isProdMode = APP_MODE === 'prod';
