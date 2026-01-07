import { PrismaService } from '../prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { UpdateModeDto } from './dto/update-mode.dto';
export declare class ConversationsService {
    private prisma;
    private websocketGateway;
    private readonly logger;
    constructor(prisma: PrismaService, websocketGateway: WebSocketGateway);
    findAll(filters?: {
        tag?: string;
        assignedAgentId?: string;
        mode?: string;
    }): Promise<({
        user: {
            email: string;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            tags: string[];
        };
        messages: {
            id: string;
            createdAt: Date;
            agentId: string | null;
            conversationId: string;
            sender: string;
            content: string;
        }[];
        assignedAgent: {
            email: string;
            id: string;
            name: string;
            online: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tag: string | null;
        mode: string;
        userId: string;
        assignedAgentId: string | null;
        lastMessage: string | null;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            email: string | null;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            lastName: string | null;
            city: string | null;
            whatsappJid: string | null;
            tags: string[];
        };
        messages: {
            id: string;
            createdAt: Date;
            agentId: string | null;
            conversationId: string;
            sender: string;
            content: string;
        }[];
        assignedAgent: {
            email: string;
            id: string;
            name: string;
            online: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tag: string | null;
        mode: string;
        userId: string;
        assignedAgentId: string | null;
        lastMessage: string | null;
    }>;
    create(createDto: CreateConversationDto): Promise<{
        user: {
            email: string | null;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            lastName: string | null;
            city: string | null;
            whatsappJid: string | null;
            tags: string[];
        };
        messages: {
            id: string;
            createdAt: Date;
            agentId: string | null;
            conversationId: string;
            sender: string;
            content: string;
        }[];
        assignedAgent: {
            email: string;
            id: string;
            name: string;
            online: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tag: string | null;
        mode: string;
        userId: string;
        assignedAgentId: string | null;
        lastMessage: string | null;
    }>;
    assign(id: string, assignDto: AssignConversationDto): Promise<{
        user: {
            email: string | null;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            lastName: string | null;
            city: string | null;
            whatsappJid: string | null;
            tags: string[];
        };
        assignedAgent: {
            email: string;
            password: string;
            id: string;
            name: string;
            role: string;
            online: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tag: string | null;
        mode: string;
        userId: string;
        assignedAgentId: string | null;
        lastMessage: string | null;
    }>;
    updateMode(id: string, updateModeDto: UpdateModeDto): Promise<{
        user: {
            email: string | null;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            lastName: string | null;
            city: string | null;
            whatsappJid: string | null;
            tags: string[];
        };
        assignedAgent: {
            email: string;
            password: string;
            id: string;
            name: string;
            role: string;
            online: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tag: string | null;
        mode: string;
        userId: string;
        assignedAgentId: string | null;
        lastMessage: string | null;
    }>;
}
