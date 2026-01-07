import { IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  name?: string;
}

