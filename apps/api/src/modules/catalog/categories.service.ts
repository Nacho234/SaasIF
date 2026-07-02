import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(businessId: string) {
    return this.prisma.category.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
  }

  create(businessId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description: dto.description ?? '',
        color: dto.color ?? '#64748b',
      },
    });
  }

  async update(businessId: string, id: string, dto: UpdateCategoryDto) {
    const found = await this.prisma.category.findFirst({ where: { id, businessId }, select: { id: true } });
    if (!found) throw new NotFoundException('Categoría no encontrada.');
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
