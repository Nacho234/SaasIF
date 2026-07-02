import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  list(businessId: string) {
    return this.prisma.brand.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
  }

  create(businessId: string, dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: { businessId, name: dto.name.trim(), description: dto.description ?? '' },
    });
  }

  async update(businessId: string, id: string, dto: UpdateBrandDto) {
    const found = await this.prisma.brand.findFirst({ where: { id, businessId }, select: { id: true } });
    if (!found) throw new NotFoundException('Marca no encontrada.');
    return this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
