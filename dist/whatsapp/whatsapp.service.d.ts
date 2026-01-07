import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { BotService } from '../bot/bot.service';
import { BranchesService } from '../branches/branches.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
export declare class WhatsAppService implements OnModuleInit {
    private prisma;
    private messagesService;
    private botService;
    private branchesService;
    private websocketGateway;
    private socket;
    private readonly logger;
    private sessionPath;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private currentQR;
    private connectionState;
    private pendingMessages;
    private readonly maxPendingMessageAge;
    private readonly maxMessageRetries;
    private baileys;
    private getBaileys;
    constructor(prisma: PrismaService, messagesService: MessagesService, botService: BotService, branchesService: BranchesService, websocketGateway: WebSocketGateway);
    onModuleInit(): Promise<void>;
    private ensureSessionDirectory;
    private initializeWhatsApp;
    private handleIncomingMessage;
    private extractMessageContent;
    sendTypingIndicator(phone: string, isTyping?: boolean): Promise<boolean>;
    sendMessage(phone: string, content: string, showTyping?: boolean): Promise<boolean>;
    private addToPendingQueue;
    private processPendingMessages;
    sendImage(phone: string, imageUrl: string, caption?: string): Promise<boolean>;
    getConnectionStatus(): Promise<{
        connected: boolean;
        state: 'connecting' | 'connected' | 'disconnected';
        phoneNumber?: string;
        pendingMessages: number;
        hasQR: boolean;
    }>;
    getQRCode(): Promise<{
        qr: string | null;
        state: string;
    }>;
    reconnect(): Promise<{
        success: boolean;
        message: string;
    }>;
    disconnect(): Promise<{
        success: boolean;
        message: string;
    }>;
    syncMessagesFromWhatsApp(conversationId: string): Promise<{
        success: boolean;
        message: string;
        syncedCount: number;
    }>;
    private syncExistingConversations;
    private syncChatsToConversations;
}
