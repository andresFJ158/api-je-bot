import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export enum TransactionType {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
}

export class CreateInventoryTransactionDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  glosa?: string;

  @IsString()
  @IsOptional()
  agentId?: string;
}

