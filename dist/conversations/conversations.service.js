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
var ConversationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const websocket_gateway_1 = require("../websocket/websocket.gateway");
const utils_1 = require("../common/utils");
let ConversationsService = ConversationsService_1 = class ConversationsService {
    constructor(prisma, websocketGateway) {
        this.prisma = prisma;
        this.websocketGateway = websocketGateway;
        this.logger = new common_1.Logger(ConversationsService_1.name);
    }
    async findAll(filters) {
        try {
            this.logger.debug(`Finding conversations with filters: ${JSON.stringify(filters)}`);
            const whereClause = {};
            if (filters?.tag)
                whereClause.tag = filters.tag;
            if (filters?.assignedAgentId)
                whereClause.assignedAgentId = filters.assignedAgentId;
            if (filters?.mode)
                whereClause.mode = filters.mode;
            this.logger.debug(`Where clause: ${JSON.stringify(whereClause)}`);
            this.logger.debug('Attempting to fetch conversations from database...');
            const totalCount = await this.prisma.conversation.count();
            this.logger.debug(`Total conversations in database: ${totalCount}`);
            const conversations = await this.prisma.conversation.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            id: true,
                            phone: true,
                            name: true,
                            email: true,
                            tags: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                    assignedAgent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            online: true,
                        },
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
                orderBy: { updatedAt: 'desc' },
            });
            this.logger.debug(`Found ${conversations.length} conversations`);
            return conversations;
        }
        catch (error) {
            this.logger.error(`Error finding conversations: ${error.message}`);
            this.logger.error(`Error stack: ${error.stack}`);
            this.logger.error(`Error name: ${error.name}`);
            if (error.code) {
                this.logger.error(`Error code: ${error.code}`);
            }
            throw error;
        }
    }
    async findOne(id) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id },
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
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        return conversation;
    }
    async create(createDto) {
        const normalizedPhone = (0, utils_1.normalizePhoneNumber)(createDto.phone);
        if (!normalizedPhone || normalizedPhone.length < 8) {
            throw new common_1.NotFoundException('El número de teléfono no es válido');
        }
        let user = await this.prisma.user.findUnique({
            where: { phone: normalizedPhone },
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    phone: normalizedPhone,
                    name: createDto.name || normalizedPhone,
                },
            });
        }
        let conversation = await this.prisma.conversation.findFirst({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    userId: user.id,
                    mode: 'BOT',
                },
            });
            const fullConversation = await this.findOne(conversation.id);
            this.websocketGateway.broadcastConversationUpdate(fullConversation);
            return fullConversation;
        }
        return this.findOne(conversation.id);
    }
    async assign(id, assignDto) {
        const conversation = await this.prisma.conversation.update({
            where: { id },
            data: {
                assignedAgentId: assignDto.agentId,
                tag: assignDto.tag,
            },
            include: {
                user: true,
                assignedAgent: true,
            },
        });
        this.websocketGateway.broadcastConversationUpdate(conversation);
        return conversation;
    }
    async updateMode(id, updateModeDto) {
        const conversation = await this.prisma.conversation.update({
            where: { id },
            data: { mode: updateModeDto.mode },
            include: {
                user: true,
                assignedAgent: true,
            },
        });
        this.websocketGateway.broadcastConversationUpdate(conversation);
        return conversation;
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = ConversationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        websocket_gateway_1.WebSocketGateway])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map