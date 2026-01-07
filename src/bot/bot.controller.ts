import { Controller, Get, Put, Body, UseGuards, Logger } from '@nestjs/common';
import { BotService } from './bot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateBotConfigDto } from './dto/update-bot-config.dto';

@Controller('bot-config')
@UseGuards(JwtAuthGuard)
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(private botService: BotService) {}

  @Get()
  async getConfig() {
    try {
      this.logger.debug('GET /bot-config');
      return await this.botService.getBotConfig();
    } catch (error) {
      this.logger.error(`Error in getConfig: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put()
  updateConfig(@Body() updateDto: UpdateBotConfigDto) {
    return this.botService.updateBotConfig(updateDto);
  }
}

