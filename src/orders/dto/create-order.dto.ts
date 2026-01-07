import { IsString, IsOptional, IsNumber, Min, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number; // Si no se proporciona, se usa el precio actual del producto

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsOptional()
  userId?: string; // Cliente (contacto) - opcional

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number; // Descuento general del pedido

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number; // Impuestos

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

