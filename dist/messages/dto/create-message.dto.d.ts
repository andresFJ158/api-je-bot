export declare class CreateMessageDto {
    conversationId: string;
    sender: 'user' | 'bot' | 'agent';
    content: string;
    agentId?: string;
}
