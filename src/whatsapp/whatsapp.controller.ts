import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(private whatsappService: WhatsAppService) { }

  @Get('status')
  async getStatus() {
    return await this.whatsappService.getConnectionStatus();
  }

  @Get('qr')
  async getQR() {
    return await this.whatsappService.getQRCode();
  }

  @Post('reconnect')
  async reconnect() {
    return await this.whatsappService.reconnect();
  }

  @Post('disconnect')
  async disconnect() {
    return await this.whatsappService.disconnect();
  }

  @Post('sync-messages/:conversationId')
  async syncMessages(@Param('conversationId') conversationId: string) {
    return await this.whatsappService.syncMessagesFromWhatsApp(conversationId);
  }
}

