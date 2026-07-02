import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio.' })
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1, { message: 'El SKU es obligatorio.' })
  @MaxLength(80)
  sku!: string;

  @IsOptional() @IsString() @MaxLength(80)
  barcode?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  categoryId?: string | null;

  @IsOptional() @IsString()
  brandId?: string | null;

  @IsNumber() @Min(0, { message: 'El costo no puede ser negativo.' })
  costPrice!: number;

  @IsNumber() @Min(0, { message: 'El precio debe ser mayor o igual a cero.' })
  salePrice!: number;

  @IsOptional() @IsInt() @Min(0, { message: 'El stock no puede ser negativo.' })
  stock?: number;

  @IsOptional() @IsInt() @Min(0)
  minStock?: number;

  @IsOptional() @IsBoolean()
  isFavorite?: boolean;

  @IsOptional() @IsString()
  notes?: string;
}

/** Update: todos los campos opcionales, más isActive para (des)activar. */
export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) sku?: string;
  @IsOptional() @IsString() @MaxLength(80) barcode?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string | null;
  @IsOptional() @IsString() brandId?: string | null;
  @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsNumber() @Min(0) salePrice?: number;
  @IsOptional() @IsInt() @Min(0) minStock?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFavorite?: boolean;
  @IsOptional() @IsString() notes?: string;
}
