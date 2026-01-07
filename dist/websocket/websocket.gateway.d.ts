import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private configService;
    private prisma;
    server: Server;
    private logger;
    private connectedClients;
    constructor(jwtService: JwtService, configService: ConfigService, prisma: PrismaService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    broadcastNewMessage(message: any): void;
    broadcastConversationUpdate(conversation: any): void;
    broadcastIncomingMessage(message: any): void;
    broadcastNewOrder(order: any): void;
    sendToAgent(agentId: string, event: string, data: any): void;
}
