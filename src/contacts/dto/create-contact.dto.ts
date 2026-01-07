import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  initialMessage?: string; // Mensaje opcional para iniciar conversación
}

