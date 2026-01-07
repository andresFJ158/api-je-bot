"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const conversations_module_1 = require("./conversations/conversations.module");
const messages_module_1 = require("./messages/messages.module");
const bot_module_1 = require("./bot/bot.module");
const whatsapp_module_1 = require("./whatsapp/whatsapp.module");
const websocket_module_1 = require("./websocket/websocket.module");
const agents_module_1 = require("./agents/agents.module");
const products_module_1 = require("./products/products.module");
const branches_module_1 = require("./branches/branches.module");
const categories_module_1 = require("./categories/categories.module");
const inventory_module_1 = require("./inventory/inventory.module");
const contacts_module_1 = require("./contacts/contacts.module");
const quick_replies_module_1 = require("./quick-replies/quick-replies.module");
const orders_module_1 = require("./orders/orders.module");
const payment_methods_module_1 = require("./payment-methods/payment-methods.module");
const health_module_1 = require("./health/health.module");
const combos_module_1 = require("./combos/combos.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            conversations_module_1.ConversationsModule,
            messages_module_1.MessagesModule,
            bot_module_1.BotModule,
            whatsapp_module_1.WhatsAppModule,
            websocket_module_1.WebSocketModule,
            agents_module_1.AgentsModule,
            products_module_1.ProductsModule,
            branches_module_1.BranchesModule,
            categories_module_1.CategoriesModule,
            inventory_module_1.InventoryModule,
            contacts_module_1.ContactsModule,
            quick_replies_module_1.QuickRepliesModule,
            orders_module_1.OrdersModule,
            payment_methods_module_1.PaymentMethodsModule,
            health_module_1.HealthModule,
            combos_module_1.CombosModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map