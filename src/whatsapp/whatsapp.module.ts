import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';
import { BotModule } from '../bot/bot.module';
import { BranchesModule } from '../branches/branches.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => BotModule),
    forwardRef(() => BranchesModule),
    WebSocketModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule { }

