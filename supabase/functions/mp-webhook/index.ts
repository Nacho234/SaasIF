// =====================================================================
// Edge Function: mp-webhook
// Recibe las notificaciones de Mercado Pago. Ante un pago APROBADO, activa/
// renueva la suscripción del negocio (activate_subscription) y actualiza el
// registro en subscription_payments. Idempotente ante reintentos de MP.
//
// verify_jwt = false  →  MP no manda nuestro JWT. La seguridad viene de que
// re-consultamos el pago a la API de MP con nuestro MP_ACCESS_TOKEN (no
// confiamos en el body). Secrets: MP_ACCESS_TOKEN (+ los de plataforma).
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ok = () => new Response('ok', { status: 200, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let type = url.searchParams.get('type') ?? url.searchParams.get('topic');
    let paymentId = url.searchParams.get('data.id') ?? url.searchParams.get('id');

    if (!type || !paymentId) {
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      type = type ?? (body.type as string) ?? (body.topic as string);
      const data = body.data as { id?: string } | undefined;
      paymentId = paymentId ?? data?.id ?? (body.id as string);
    }

    // Sólo notificaciones de pago; el resto se ignora (MP igual espera 200).
    if (type !== 'payment' || !paymentId) return ok();

    const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    if (!MP_TOKEN) return ok();

    // Re-consultar el pago a MP (fuente de verdad, no el body del webhook).
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    if (!payRes.ok) return ok();
    const pay = await payRes.json();

    const ext = String(pay.external_reference ?? '');
    const [businessId, planCode] = ext.split(':');
    const status = String(pay.status ?? ''); // approved | rejected | pending | ...
    if (!businessId || !planCode) return ok();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotencia: si este pago ya se registró como aprobado, no reactivar.
    const { data: already } = await admin
      .from('subscription_payments')
      .select('id')
      .eq('providerPaymentId', String(pay.id))
      .eq('status', 'approved')
      .maybeSingle();
    if (already) return ok();

    // Cerrar el registro pendiente de este negocio con el resultado real.
    await admin
      .from('subscription_payments')
      .update({ providerPaymentId: String(pay.id), status, raw: pay })
      .eq('businessId', businessId)
      .eq('status', 'pending');

    // Pago aprobado → activar/renovar la suscripción.
    if (status === 'approved') {
      const { error } = await admin.rpc('activate_subscription', {
        p_business_id: businessId,
        p_plan_code: planCode,
      });
      if (error) console.error('activate_subscription error', error);
    }

    return ok();
  } catch (e) {
    console.error('mp-webhook error', e);
    // Devolver 200 igual: evita tormentas de reintentos por errores transitorios.
    return ok();
  }
});
