import { IsString, IsNumber, Min, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  categoryId?: string;
  
  // Stock no se incluye aquí - se calcula automáticamente mediante transacciones de inventario
}

