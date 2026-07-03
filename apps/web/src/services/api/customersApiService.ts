import type { Customer } from '@/types';
import { apiFetch } from './apiClient';

interface ApiCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  cuit: string;
  address: string;
  birthDate: string | null;
  notes: string;
  tags: string[];
  isActive: boolean;
  debtBalance: number;
  createdAt: string;
  updatedAt: string;
}

function toCustomer(c: ApiCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    document: c.document,
    cuit: c.cuit,
    address: c.address,
    birthDate: c.birthDate,
    notes: c.notes,
    tags: c.tags,
    isActive: c.isActive,
    debtBalance: c.debtBalance,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
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
    return (await apiFetch<ApiCustomer[]>('/customers')).map(toCustomer);
  },
  async create(input: CustomerWriteInput): Promise<Customer> {
    return toCustomer(await apiFetch<ApiCustomer>('/customers', { method: 'POST', body: input }));
  },
  async update(id: string, input: CustomerWriteInput): Promise<Customer> {
    return toCustomer(await apiFetch<ApiCustomer>(`/customers/${id}`, { method: 'PUT', body: input }));
  },
};
