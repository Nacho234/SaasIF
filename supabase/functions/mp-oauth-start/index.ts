// Inicia el OAuth de Mercado Pago para el negocio del usuario logueado.
// Genera un state anti-CSRF, lo guarda y devuelve la URL de autorización de MP.
const SB = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization") ?? "";
  // ¿Quién es el usuario? (valida el JWT contra Supabase Auth)
  const ur = await fetch(`${SB}/auth/v1/user`, { headers: { Authorization: auth, apikey: SVC } });
  if (!ur.ok) return json({ error: "No autenticado" }, 401);
  const user = await ur.json();

  // businessId del usuario (service_role)
  const pr = await fetch(`${SB}/rest/v1/profiles?select=businessId&id=eq.${user.id}`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });
  const prof = (await pr.json())[0];
  if (!prof) return json({ error: "Sin perfil" }, 400);

  const state = crypto.randomUUID();
  await fetch(`${SB}/rest/v1/mp_oauth_states`, {
    method: "POST",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
    body: JSON.stringify({ state, businessId: prof.businessId }),
  });

  const redirectUri = `${SB}/functions/v1/mp-oauth-callback`;
  const url =
    `https://auth.mercadopago.com/authorization?client_id=${MP_CLIENT_ID}` +
    `&response_type=code&platform_id=mp&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return json({ url });
});
