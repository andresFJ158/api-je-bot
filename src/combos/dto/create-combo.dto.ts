import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, Min, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ComboItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateComboDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  offerPrice: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items: ComboItemDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

