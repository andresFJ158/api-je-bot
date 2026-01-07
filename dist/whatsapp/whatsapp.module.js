"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppModule = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("./whatsapp.service");
const whatsapp_controller_1 = require("./whatsapp.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const messages_module_1 = require("../messages/messages.module");
const bot_module_1 = require("../bot/bot.module");
const branches_module_1 = require("../branches/branches.module");
const websocket_module_1 = require("../websocket/websocket.module");
let WhatsAppModule = class WhatsAppModule {
};
exports.WhatsAppModule = WhatsAppModule;
exports.WhatsAppModule = WhatsAppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            (0, common_1.forwardRef)(() => messages_module_1.MessagesModule),
            (0, common_1.forwardRef)(() => bot_module_1.BotModule),
            (0, common_1.forwardRef)(() => branches_module_1.BranchesModule),
            websocket_module_1.WebSocketModule,
        ],
        controllers: [whatsapp_controller_1.WhatsAppController],
        providers: [whatsapp_service_1.WhatsAppService],
        exports: [whatsapp_service_1.WhatsAppService],
    })
], WhatsAppModule);
//# sourceMappingURL=whatsapp.module.js.map