import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateQuickReplyDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;
}

