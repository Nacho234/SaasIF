// Callback del OAuth de Mercado Pago. MP redirige acá con code+state.
// Verifica el state, canjea el code por el token del negocio y lo guarda.
const SB = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID")!;
const MP_CLIENT_SECRET = Deno.env.get("MP_CLIENT_SECRET")!;
const APP = Deno.env.get("APP_URL") ?? SB;

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const back = (r: string) =>
    new Response(null, { status: 302, headers: { Location: `${APP}/configuracion?mp=${r}` } });

  if (!code || !state) return back("error");

  // Verificar state (single-use)
  const sr = await fetch(`${SB}/rest/v1/mp_oauth_states?select=businessId&state=eq.${state}`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });
  const st = (await sr.json())[0];
  if (!st) return back("error");
  await fetch(`${SB}/rest/v1/mp_oauth_states?state=eq.${state}`, {
    method: "DELETE",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });

  // Canjear el code por el token del negocio
  const redirectUri = `${SB}/functions/v1/mp-oauth-callback`;
  const tr = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tok = await tr.json();
  if (!tok.access_token) return back("error");

  // Guardar (service_role; el frontend nunca ve el token)
  await fetch(`${SB}/rest/v1/mp_connections`, {
    method: "POST",
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      businessId: st.businessId,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      mpUserId: String(tok.user_id ?? ""),
      publicKey: tok.public_key ?? null,
      expiresAt: new Date(Date.now() + (tok.expires_in ?? 0) * 1000).toISOString(),
      connected: true,
      updatedAt: new Date().toISOString(),
    }),
  });

  return back("connected");
});
