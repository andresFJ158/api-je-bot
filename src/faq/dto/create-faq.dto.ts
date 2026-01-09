import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, Min } from 'class-validator';

export class CreateFAQDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

