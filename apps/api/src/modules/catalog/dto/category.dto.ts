import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MinLength(1, { message: 'El nombre es obligatorio.' }) @MaxLength(120)
  name!: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
