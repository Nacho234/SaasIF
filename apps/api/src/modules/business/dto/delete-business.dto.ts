import { Equals, IsString } from 'class-validator';

export class DeleteBusinessDto {
  @IsString({ message: 'Ingresá tu contraseña.' })
  password!: string;

  /** El usuario debe escribir exactamente "ELIMINAR" para confirmar. */
  @Equals('ELIMINAR', { message: 'Escribí ELIMINAR para confirmar.' })
  confirmation!: string;
}
