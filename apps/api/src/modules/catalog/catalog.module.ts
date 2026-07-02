import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

/** Dominio Catálogo: productos, categorías y marcas (multi-tenant por businessId). */
@Module({
  controllers: [ProductsController, CategoriesController, BrandsController],
  providers: [ProductsService, CategoriesService, BrandsService],
})
export class CatalogModule {}
