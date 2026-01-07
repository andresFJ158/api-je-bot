import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ComboItemDto } from './create-combo.dto';

export class UpdateComboDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  offerPrice?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  @IsOptional()
  items?: ComboItemDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

