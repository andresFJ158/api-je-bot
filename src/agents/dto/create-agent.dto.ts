import { IsString, IsEmail, MinLength, IsOptional, IsIn } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  @IsIn(['admin', 'agent'])
  role?: string;
}

