import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
export declare class MessagesController {
    private messagesService;
    constructor(messagesService: MessagesService);
    create(createDto: CreateMessageDto, req: any): Promise<{
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
