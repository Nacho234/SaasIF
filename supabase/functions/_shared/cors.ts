// Cabeceras CORS compartidas por las Edge Functions llamadas desde la landing.
// ALLOWED_ORIGIN se puede fijar por secret para restringir al dominio de la landing;
// por defecto permite cualquier origen (útil en dev).
const origin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

export const corsHeaders = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Respuesta JSON con CORS. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
