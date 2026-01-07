"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const websocket_gateway_1 = require("../websocket/websocket.gateway");
const bot_service_1 = require("../bot/bot.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
let MessagesService = class MessagesService {
    constructor(prisma, websocketGateway, botService, whatsappService) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
        this.botService = botService;
        this.whatsappService = whatsappService;
    }
    async create(createDto) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: createDto.conversationId },
            include: { user: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId: createDto.conversationId,
                sender: createDto.sender,
                content: createDto.content,
                agentId: createDto.sender === 'agent' ? createDto.agentId : null,
            },
            include: {
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        const updatedConversation = await this.prisma.conversation.update({
            where: { id: createDto.conversationId },
            data: {
                lastMessage: createDto.content,
                updatedAt: new Date(),
                ...(createDto.sender === 'agent' && { mode: 'HUMAN' }),
            },
            include: {
                user: true,
                assignedAgent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        online: true,
                    },
                },
            },
        });
        this.websocketGateway.broadcastConversationUpdate(updatedConversation);
        this.websocketGateway.broadcastNewMessage({
            ...message,
            conversation: {
                id: updatedConversation.id,
                userId: updatedConversation.userId,
                assignedAgentId: updatedConversation.assignedAgentId,
                tag: updatedConversation.tag,
                mode: updatedConversation.mode,
                lastMessage: updatedConversation.lastMessage,
                createdAt: updatedConversation.createdAt,
                updatedAt: updatedConversation.updatedAt,
                user: {
                    id: updatedConversation.user.id,
                    phone: updatedConversation.user.phone,
                    name: updatedConversation.user.name,
                    lastName: updatedConversation.user.lastName,
                    email: updatedConversation.user.email,
                    city: updatedConversation.user.city,
                },
            },
        });
        if (conversation.mode === 'BOT' && createDto.sender === 'user') {
            await this.whatsappService.sendTypingIndicator(conversation.user.phone, true);
            try {
                const botResponse = await this.botService.generateResponse(createDto.conversationId, createDto.content);
                if (botResponse) {
                    const botMessage = await this.create({
                        conversationId: createDto.conversationId,
                        sender: 'bot',
                        content: botResponse,
                    });
                    await this.whatsappService.sendMessage(conversation.user.phone, botResponse, true);
                }
                else {
                    await this.whatsappService.sendTypingIndicator(conversation.user.phone, false);
                }
            }
            catch (error) {
                await this.whatsappService.sendTypingIndicator(conversation.user.phone, false);
                throw error;
            }
        }
        else if (createDto.sender === 'agent') {
            const phoneOrJid = conversation.user.whatsappJid || conversation.user.phone;
            try {
                const sent = await this.whatsappService.sendMessage(phoneOrJid, createDto.content);
                if (!sent) {
                    console.warn(`Failed to send message to WhatsApp for conversation ${createDto.conversationId}, but message saved in database`);
                }
            }
            catch (error) {
                console.error(`Error sending message to WhatsApp: ${error.message}`, error);
            }
        }
        else if (createDto.sender === 'bot') {
            if (!createDto.skipWhatsApp) {
                await this.whatsappService.sendMessage(conversation.user.phone, createDto.content);
            }
        }
        return message;
    }
    async findByConversation(conversationId) {
        return this.prisma.message.findMany({
            where: { conversationId },
            include: {
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => whatsapp_service_1.WhatsAppService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        websocket_gateway_1.WebSocketGateway,
        bot_service_1.BotService,
        whatsapp_service_1.WhatsAppService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map