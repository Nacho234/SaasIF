import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta como pública (sin JWT). Ej: login, register, health. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
