import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// CORS configuration for WebSocket - same as main.ts
const getWebSocketCorsOrigin = () => {
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:3030', 'http://localhost:3000'];
  
  return (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    callback(null, true); // Allow for WebSocket connections
  };
};

@NestWebSocketGateway({
  cors: {
    origin: getWebSocketCorsOrigin(),
    credentials: true,
  },
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');
  private connectedClients: Map<string, { agentId: string; socket: Socket }> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Get token from handshake auth
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted to connect without token`);
        client.disconnect();
        return;
      }

      // Verify token
      const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
      const payload = this.jwtService.verify(token, { secret });

      // Verify agent exists
      const agent = await this.prisma.agent.findUnique({
        where: { id: payload.sub },
      });

      if (!agent) {
        this.logger.warn(`Agent not found for token: ${payload.sub}`);
        client.disconnect();
        return;
      }

      // Store client connection
      this.connectedClients.set(client.id, { agentId: agent.id, socket: client });

      // Join agent room for targeted messages
      client.join(`agent:${agent.id}`);

      this.logger.log(`Client connected: ${client.id} (Agent: ${agent.email})`);
      
      // Send connection confirmation
      client.emit('connected', { agentId: agent.id, message: 'Connected successfully' });
    } catch (error) {
      this.logger.error(`Error authenticating client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      this.logger.log(`Client disconnected: ${client.id} (Agent: ${clientInfo.agentId})`);
      this.connectedClients.delete(client.id);
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  broadcastNewMessage(message: any) {
    // Broadcast to all connected clients
    this.server.emit('new_message', message);
    this.logger.debug(`Broadcasting new_message: ${message.id}`);
  }

  broadcastConversationUpdate(conversation: any) {
    // Broadcast to all connected clients
    this.server.emit('conversation_update', conversation);
    this.logger.debug(`Broadcasting conversation_update: ${conversation.id}`);
  }

  broadcastIncomingMessage(message: any) {
    // Broadcast to all connected clients
    this.server.emit('incoming_message', message);
    this.logger.debug(`Broadcasting incoming_message`);
  }

  broadcastNewOrder(order: any) {
    // Broadcast to all connected clients
    this.server.emit('new_order', order);
    this.logger.debug(`Broadcasting new_order: ${order.id}`);
  }

  // Send message to specific agent
  sendToAgent(agentId: string, event: string, data: any) {
    this.server.to(`agent:${agentId}`).emit(event, data);
    this.logger.debug(`Sending ${event} to agent: ${agentId}`);
  }
}

