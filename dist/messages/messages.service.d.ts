import { PrismaService } from '../prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { BotService } from '../bot/bot.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateMessageDto } from './dto/create-message.dto';
export declare class MessagesService {
    private prisma;
    private websocketGateway;
    private botService;
    private whatsappService;
    constructor(prisma: PrismaService, websocketGateway: WebSocketGateway, botService: BotService, whatsappService: WhatsAppService);
    create(createDto: CreateMessageDto): Promise<{
        agent: {
            email: string;
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        agentId: string | null;
        conversationId: string;
        sender: string;
        content: string;
    }>;
    findByConversation(conversationId: string): Promise<({
        agent: {
            email: string;
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        agentId: string | null;
        conversationId: string;
        sender: string;
        content: string;
    })[]>;
}
