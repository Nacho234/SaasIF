import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Product } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  brandId?: string;
  active?: 'true' | 'false';
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Convierte los Decimal de Prisma a number para el frontend. */
  private serialize(p: Product) {
    return { ...p, costPrice: Number(p.costPrice), salePrice: Number(p.salePrice) };
  }

  async list(businessId: string, filters: ProductFilters = {}) {
    const where: Prisma.ProductWhereInput = { businessId };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.active === 'true') where.isActive = true;
    if (filters.active === 'false') where.isActive = false;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const products = await this.prisma.product.findMany({ where, orderBy: { name: 'asc' } });
    return products.map((p) => this.serialize(p));
  }

  async getById(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Producto no encontrado.');
    return this.serialize(product);
  }

  async create(businessId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { businessId, sku: dto.sku },
      select: { id: true },
    });
    if (existing) throw new ConflictException('El SKU ya existe en este negocio.');

    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name.trim(),
        sku: dto.sku.trim(),
        barcode: dto.barcode ?? '',
        description: dto.description ?? '',
        categoryId: dto.categoryId || null,
        brandId: dto.brandId || null,
        costPrice: dto.costPrice,
        salePrice: dto.salePrice,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        isFavorite: dto.isFavorite ?? false,
        notes: dto.notes ?? '',
      },
    });
    return this.serialize(product);
  }

  async update(businessId: string, id: string, dto: UpdateProductDto) {
    await this.getById(businessId, id); // valida pertenencia al negocio

    if (dto.sku) {
      const clash = await this.prisma.product.findFirst({
        where: { businessId, sku: dto.sku, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new ConflictException('El SKU ya existe en este negocio.');
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku.trim() } : {}),
        ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId || null } : {}),
        ...(dto.brandId !== undefined ? { brandId: dto.brandId || null } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
        ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
        ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isFavorite !== undefined ? { isFavorite: dto.isFavorite } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return this.serialize(product);
  }
}
