import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/require-permission.decorator';
import type { AuthUser } from '@/modules/auth/types';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.brands.list(user.businessId);
  }

  @RequirePermission('edit_products')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBrandDto) {
    return this.brands.create(user.businessId, dto);
  }

  @RequirePermission('edit_products')
  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.update(user.businessId, id, dto);
  }
}
