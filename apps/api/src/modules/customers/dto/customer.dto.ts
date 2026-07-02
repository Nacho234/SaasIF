import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio.' })
  @MaxLength(200)
  name!: string;

  @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(150)
  email?: string;

  @IsOptional() @IsString() @MaxLength(50)
  document?: string;

  @IsOptional() @IsString() @MaxLength(50)
  cuit?: string;

  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  /** Fecha de nacimiento en ISO (YYYY-MM-DD) o vacío/null. */
  @IsOptional() @IsString()
  birthDate?: string | null;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}

/** Update: todos opcionales, más isActive para (des)activar. debtBalance NO se toca acá. */
export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(150) email?: string;
  @IsOptional() @IsString() @MaxLength(50) document?: string;
  @IsOptional() @IsString() @MaxLength(50) cuit?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() birthDate?: string | null;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
