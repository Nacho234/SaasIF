import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ProductsService, type ProductFilters } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/require-permission.decorator';
import type { AuthUser } from '@/modules/auth/types';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() filters: ProductFilters) {
    return this.products.list(user.businessId, filters);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.getById(user.businessId, id);
  }

  @RequirePermission('edit_products')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user.businessId, dto);
  }

  @RequirePermission('edit_products')
  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(user.businessId, id, dto);
  }
}
