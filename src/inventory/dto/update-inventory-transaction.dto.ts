import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { TransactionType } from './create-inventory-transaction.dto';

export class UpdateInventoryTransactionDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  glosa?: string;

  @IsString()
  @IsOptional()
  agentId?: string;
}

