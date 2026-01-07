import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) { }

  @Post()
  create(@Body() createDto: CreateMessageDto, @Request() req) {
    // If sender is agent, automatically set agentId from authenticated user
    if (createDto.sender === 'agent' && req.user?.id) {
      createDto.agentId = req.user.id;
    }
    return this.messagesService.create(createDto);
  }

  @Get('conversation/:conversationId')
  findByConversation(@Param('conversationId') conversationId: string) {
    return this.messagesService.findByConversation(conversationId);
  }
}

