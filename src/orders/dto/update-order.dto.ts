import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';

export enum OrderStatus {
  PENDIENTE_DE_PAGO = 'PENDIENTE_DE_PAGO',
  PAGO_RECIBIDO = 'PAGO_RECIBIDO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
}

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

