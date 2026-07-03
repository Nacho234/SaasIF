import type { BusinessSettings } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { supabase } from './supabaseClient';

/**
 * Configuración del negocio en prod. Se guarda todo el objeto `settings` como JSONB en
 * business_settings.data, y los datos del negocio (nombre, cuit, etc.) también en la tabla
 * `businesses` (canónica, la usa el resto). loadSettings rellena el store al entrar.
 */

function biz(): string | null {
  return useAuthStore.getState().businessId;
}

export async function loadSettings(): Promise<void> {
  const bid = biz();
  if (!bid) return;
  const [bsRes, bizRes] = await Promise.all([
    supabase.from('business_settings').select('data').eq('businessId', bid).maybeSingle(),
    supabase.from('businesses').select('name, category, cuit, phone, email, address, logoUrl').eq('id', bid).maybeSingle(),
  ]);
  const patch: Partial<BusinessSettings> = {};
  if (bsRes.data?.data) Object.assign(patch, bsRes.data.data as Partial<BusinessSettings>);
  const b = bizRes.data as Record<string, unknown> | null;
  if (b) {
    patch.businessName = (b.name as string) ?? patch.businessName;
    patch.category = (b.category as string) ?? patch.category;
    patch.cuit = (b.cuit as string) ?? patch.cuit;
    patch.phone = (b.phone as string) ?? patch.phone;
    patch.email = (b.email as string) ?? patch.email;
    patch.address = (b.address as string) ?? patch.address;
    patch.logo = (b.logoUrl as string) ?? null;
  }
  if (Object.keys(patch).length) useBusinessStore.getState().updateSettings(patch);
}

export async function saveSettings(settings: BusinessSettings): Promise<void> {
  const bid = biz();
  if (!bid) return;
  const [bsRes, bizRes] = await Promise.all([
    supabase.from('business_settings').update({ data: settings }).eq('businessId', bid),
    supabase
      .from('businesses')
      .update({
        name: settings.businessName,
        category: settings.category ?? '',
        cuit: settings.cuit ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
        address: settings.address ?? '',
        logoUrl: settings.logo ?? null,
      })
      .eq('id', bid),
  ]);
  if (bsRes.error) throw new Error(bsRes.error.message);
  if (bizRes.error) throw new Error(bizRes.error.message);
}
