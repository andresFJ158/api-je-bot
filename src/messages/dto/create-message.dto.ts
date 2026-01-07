import { IsString, IsUUID, IsIn, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  conversationId: string;

  @IsString()
  @IsIn(['user', 'bot', 'agent'])
  sender: 'user' | 'bot' | 'agent';

  @IsString()
  content: string;

  @IsUUID()
  @IsOptional()
  agentId?: string; // ID of the agent sending the message (if sender is "agent")
}

