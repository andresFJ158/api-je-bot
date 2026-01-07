import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BranchesModule } from '../branches/branches.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, BranchesModule, forwardRef(() => OrdersModule)],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule { }

