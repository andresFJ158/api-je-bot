import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AssignConversationDto {
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @IsString()
  @IsOptional()
  tag?: string;
}

