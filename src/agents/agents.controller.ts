import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAgentDto } from './dto/create-agent.dto';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(private agentsService: AgentsService) { }

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Post()
  async create(@Body() createDto: CreateAgentDto) {
    try {
      this.logger.debug(`Creating agent with data: ${JSON.stringify({ ...createDto, password: '***' })}`);
      return await this.agentsService.create(createDto);
    } catch (error: any) {
      this.logger.error(`Error creating agent: ${error.message}`, error.stack);

      // Handle Prisma unique constraint error (duplicate email)
      if (error.code === 'P2002') {
        throw new BadRequestException('El email ya está en uso');
      }

      throw error;
    }
  }

  @Patch(':id/online')
  updateOnlineStatus(
    @Param('id') id: string,
    @Body() body: { online: boolean },
  ) {
    return this.agentsService.updateOnlineStatus(id, body.online);
  }
}

