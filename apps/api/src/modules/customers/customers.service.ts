import { Injectable, NotFoundException } from '@nestjs/common';
import type { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

export interface CustomerFilters {
  search?: string;
  active?: 'true' | 'false';
}

/** '' o null → null; ISO válido → Date. */
function parseBirthDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Decimal de Prisma → number para el frontend. */
  private serialize(c: Customer) {
    return { ...c, debtBalance: Number(c.debtBalance) };
  }

  async list(businessId: string, filters: CustomerFilters = {}) {
    const where: Prisma.CustomerWhereInput = { businessId };
    if (filters.active === 'true') where.isActive = true;
    if (filters.active === 'false') where.isActive = false;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { document: { contains: filters.search, mode: 'insensitive' } },
        { cuit: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const customers = await this.prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
    return customers.map((c) => this.serialize(c));
  }

  async getById(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    return this.serialize(customer);
  }

  async create(businessId: string, dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        businessId,
        name: dto.name.trim(),
        phone: dto.phone ?? '',
        email: dto.email ?? '',
        document: dto.document ?? '',
        cuit: dto.cuit ?? '',
        address: dto.address ?? '',
        birthDate: parseBirthDate(dto.birthDate),
        notes: dto.notes ?? '',
        tags: dto.tags ?? [],
      },
    });
    return this.serialize(customer);
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    await this.getById(businessId, id); // valida pertenencia al negocio

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.document !== undefined ? { document: dto.document } : {}),
        ...(dto.cuit !== undefined ? { cuit: dto.cuit } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.birthDate !== undefined ? { birthDate: parseBirthDate(dto.birthDate) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.serialize(customer);
  }
}
