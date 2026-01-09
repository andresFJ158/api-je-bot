import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { BotModule } from './bot/bot.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AgentsModule } from './agents/agents.module';
import { ProductsModule } from './products/products.module';
import { BranchesModule } from './branches/branches.module';
import { CategoriesModule } from './categories/categories.module';
import { InventoryModule } from './inventory/inventory.module';
import { ContactsModule } from './contacts/contacts.module';
import { QuickRepliesModule } from './quick-replies/quick-replies.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { HealthModule } from './health/health.module';
import { CombosModule } from './combos/combos.module';
import { FAQModule } from './faq/faq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ConversationsModule,
    MessagesModule,
    BotModule,
    WhatsAppModule,
    WebSocketModule,
    AgentsModule,
    ProductsModule,
    BranchesModule,
    CategoriesModule,
    InventoryModule,
    ContactsModule,
    QuickRepliesModule,
    OrdersModule,
    PaymentMethodsModule,
    HealthModule,
    CombosModule,
    FAQModule,
  ],
})
export class AppModule { }

