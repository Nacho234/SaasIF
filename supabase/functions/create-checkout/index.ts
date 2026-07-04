// =====================================================================
// Edge Function: create-checkout
// La landing la llama DESPUÉS del signUp (usuario ya autenticado). Crea una
// preference de Mercado Pago para el plan elegido y devuelve el init_point
// (URL de pago) para redirigir. Registra el pago como 'pending'.
//
// verify_jwt = true  →  requiere el access_token del usuario recién registrado.
// Secrets necesarios: MP_ACCESS_TOKEN, APP_URL (opcional), ALLOWED_ORIGIN (opcional).
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY los inyecta la plataforma.
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const { planCode } = await req.json().catch(() => ({ planCode: '' }));
    if (!planCode) return json({ error: 'Falta planCode' }, 400);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
    if (!MP_TOKEN) return json({ error: 'MP_ACCESS_TOKEN no configurado' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';

    // 1) Identificar al usuario por su JWT (RLS aplica).
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'No autorizado' }, 401);

    const { data: profile } = await asUser
      .from('profiles')
      .select('businessId')
      .eq('id', userData.user.id)
      .single();
    if (!profile) return json({ error: 'Perfil no encontrado' }, 404);

    // 2) Leer el plan (service_role → precio confiable, no lo manda el cliente).
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: plan } = await admin
      .from('plans')
      .select('code, name, priceMonthly')
      .eq('code', planCode)
      .eq('isActive', true)
      .single();
    if (!plan || plan.priceMonthly <= 0) {
      return json({ error: 'Plan inválido para checkout (enterprise es a medida)' }, 400);
    }

    // 3) Crear la preference en Mercado Pago.
    const preference = {
      items: [
        {
          title: `Mostrador — Plan ${plan.name}`,
          quantity: 1,
          unit_price: plan.priceMonthly,
          currency_id: 'ARS',
        },
      ],
      payer: { email: userData.user.email },
      // external_reference = clave para reconciliar en el webhook.
      external_reference: `${profile.businessId}:${plan.code}`,
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      back_urls: {
        success: `${APP_URL}/?pago=ok`,
        failure: `${APP_URL}/?pago=error`,
        pending: `${APP_URL}/?pago=pendiente`,
      },
      auto_return: 'approved',
      metadata: { businessId: profile.businessId, planCode: plan.code },
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_TOKEN}` },
      body: JSON.stringify(preference),
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) return json({ error: 'No se pudo crear el checkout', detail: mp }, 502);

    // 4) Registrar el pago como pendiente (el webhook lo cierra).
    await admin.from('subscription_payments').insert({
      businessId: profile.businessId,
      planCode: plan.code,
      preferenceId: mp.id,
      amount: plan.priceMonthly,
      currency: 'ARS',
      status: 'pending',
    });

    return json({ init_point: mp.init_point, preferenceId: mp.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
