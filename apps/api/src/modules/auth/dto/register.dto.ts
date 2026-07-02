import { IsEmail, IsString, MinLength } from 'class-validator';

/** Registro de un nuevo suscriptor: crea el negocio + usuario admin + suscripción trial. */
export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'El nombre del negocio es obligatorio.' })
  businessName!: string;

  @IsString()
  @MinLength(2, { message: 'Tu nombre es obligatorio.' })
  ownerName!: string;

  @IsEmail({}, { message: 'Email inválido.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;
}
