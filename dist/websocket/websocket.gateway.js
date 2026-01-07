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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let WebSocketGateway = class WebSocketGateway {
    constructor(jwtService, configService, prisma) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new common_1.Logger('WebSocketGateway');
        this.connectedClients = new Map();
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                this.logger.warn(`Client ${client.id} attempted to connect without token`);
                client.disconnect();
                return;
            }
            const secret = this.configService.get('JWT_SECRET') || 'your-secret-key';
            const payload = this.jwtService.verify(token, { secret });
            const agent = await this.prisma.agent.findUnique({
                where: { id: payload.sub },
            });
            if (!agent) {
                this.logger.warn(`Agent not found for token: ${payload.sub}`);
                client.disconnect();
                return;
            }
            this.connectedClients.set(client.id, { agentId: agent.id, socket: client });
            client.join(`agent:${agent.id}`);
            this.logger.log(`Client connected: ${client.id} (Agent: ${agent.email})`);
            client.emit('connected', { agentId: agent.id, message: 'Connected successfully' });
        }
        catch (error) {
            this.logger.error(`Error authenticating client ${client.id}: ${error.message}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const clientInfo = this.connectedClients.get(client.id);
        if (clientInfo) {
            this.logger.log(`Client disconnected: ${client.id} (Agent: ${clientInfo.agentId})`);
            this.connectedClients.delete(client.id);
        }
        else {
            this.logger.log(`Client disconnected: ${client.id}`);
        }
    }
    broadcastNewMessage(message) {
        this.server.emit('new_message', message);
        this.logger.debug(`Broadcasting new_message: ${message.id}`);
    }
    broadcastConversationUpdate(conversation) {
        this.server.emit('conversation_update', conversation);
        this.logger.debug(`Broadcasting conversation_update: ${conversation.id}`);
    }
    broadcastIncomingMessage(message) {
        this.server.emit('incoming_message', message);
        this.logger.debug(`Broadcasting incoming_message`);
    }
    broadcastNewOrder(order) {
        this.server.emit('new_order', order);
        this.logger.debug(`Broadcasting new_order: ${order.id}`);
    }
    sendToAgent(agentId, event, data) {
        this.server.to(`agent:${agentId}`).emit(event, data);
        this.logger.debug(`Sending ${event} to agent: ${agentId}`);
    }
};
exports.WebSocketGateway = WebSocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WebSocketGateway.prototype, "server", void 0);
exports.WebSocketGateway = WebSocketGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3030',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService])
], WebSocketGateway);
//# sourceMappingURL=websocket.gateway.js.map