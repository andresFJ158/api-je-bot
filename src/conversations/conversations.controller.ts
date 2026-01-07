import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { UpdateModeDto } from './dto/update-mode.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(private conversationsService: ConversationsService) {}

  @Get()
  async findAll(
    @Query('tag') tag?: string,
    @Query('assignedAgentId') assignedAgentId?: string,
    @Query('mode') mode?: string,
  ) {
    try {
      this.logger.debug(`GET /conversations - tag: ${tag}, assignedAgentId: ${assignedAgentId}, mode: ${mode}`);
      return await this.conversationsService.findAll({ tag, assignedAgentId, mode });
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() assignDto: AssignConversationDto) {
    return this.conversationsService.assign(id, assignDto);
  }

  @Post(':id/mode')
  updateMode(@Param('id') id: string, @Body() updateModeDto: UpdateModeDto) {
    return this.conversationsService.updateMode(id, updateModeDto);
  }
}

