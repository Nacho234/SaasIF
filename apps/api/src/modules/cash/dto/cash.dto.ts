import { IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class OpenRegisterDto {
  @IsNumber() @Min(0, { message: 'El monto inicial no puede ser negativo.' })
  openingAmount!: number;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString()
  branchId?: string | null;
}

/** Movimientos manuales de caja (los de venta/apertura/cierre los genera el sistema). */
const MANUAL_MOVEMENT_TYPES = ['manual_income', 'expense', 'manual_expense', 'withdrawal', 'correction'] as const;

export class CashMovementDto {
  @IsIn(MANUAL_MOVEMENT_TYPES, { message: 'Tipo de movimiento inválido.' })
  type!: (typeof MANUAL_MOVEMENT_TYPES)[number];

  @IsIn(['in', 'out'], { message: 'La dirección debe ser "in" o "out".' })
  direction!: 'in' | 'out';

  @IsNumber() @Min(0.01, { message: 'El importe debe ser mayor a cero.' })
  amount!: number;

  @IsOptional() @IsString()
  method?: string;

  @IsOptional() @IsString()
  reason?: string;

  @IsOptional() @IsString()
  notes?: string;
}

export class CloseRegisterDto {
  @IsNumber() @Min(0, { message: 'El efectivo contado no puede ser negativo.' })
  countedCash!: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class ReopenRegisterDto {
  @IsString()
  @MinLength(3, { message: 'El motivo de reapertura es obligatorio.' })
  reason!: string;
}
