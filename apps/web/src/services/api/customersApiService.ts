import type { Customer } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase/supabaseClient';
import { ApiError } from './apiClient';

interface Row {
  id: string;
  [k: string]: unknown;
}

function businessId(): string {
  const id = useAuthStore.getState().businessId;
  if (!id) throw new ApiError(401, 'No hay una sesión activa.');
  return id;
}

function fail(error: { code?: string; message: string }): never {
  throw new ApiError(400, error.message);
}

function toCustomer(c: Row): Customer {
  return {
    id: c.id as string,
    name: (c.name as string) ?? '',
    phone: (c.phone as string) ?? '',
    email: (c.email as string) ?? '',
    document: (c.document as string) ?? '',
    cuit: (c.cuit as string) ?? '',
    address: (c.address as string) ?? '',
    birthDate: (c.birthDate as string) ?? null,
    notes: (c.notes as string) ?? '',
    tags: (c.tags as string[]) ?? [],
    isActive: Boolean(c.isActive),
    debtBalance: Number(c.debtBalance ?? 0),
    createdAt: (c.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (c.updatedAt as string) ?? new Date().toISOString(),
  };
}

export interface CustomerWriteInput {
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  cuit?: string;
  address?: string;
  birthDate?: string | null;
  notes?: string;
  tags?: string[];
  isActive?: boolean;
}

export const customersApi = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
    if (error) fail(error);
    return (data as Row[]).map(toCustomer);
  },
  async create(input: CustomerWriteInput): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        businessId: businessId(),
        name: input.name,
        phone: input.phone ?? '',
        email: input.email ?? '',
        document: input.document ?? '',
        cuit: input.cuit ?? '',
        address: input.address ?? '',
        birthDate: input.birthDate ?? null,
        notes: input.notes ?? '',
        tags: input.tags ?? [],
      })
      .select()
      .single();
    if (error) fail(error);
    return toCustomer(data as Row);
  },
  async update(id: string, input: CustomerWriteInput): Promise<Customer> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.document !== undefined) patch.document = input.document;
    if (input.cuit !== undefined) patch.cuit = input.cuit;
    if (input.address !== undefined) patch.address = input.address;
    if (input.birthDate !== undefined) patch.birthDate = input.birthDate ?? null;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    const { data, error } = await supabase.from('customers').update(patch).eq('id', id).select().single();
    if (error) fail(error);
    return toCustomer(data as Row);
  },
};
