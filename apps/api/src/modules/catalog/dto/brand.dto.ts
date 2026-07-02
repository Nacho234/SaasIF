import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBrandDto {
  @IsString() @MinLength(1, { message: 'El nombre es obligatorio.' }) @MaxLength(120)
  name!: string;

  @IsOptional() @IsString() description?: string;
}

export class UpdateBrandDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
