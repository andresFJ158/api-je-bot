import { WhatsAppService } from './whatsapp.service';
export declare class WhatsAppController {
    private whatsappService;
    constructor(whatsappService: WhatsAppService);
    getStatus(): Promise<{
        connected: boolean;
        state: "connecting" | "connected" | "disconnected";
        phoneNumber?: string;
        pendingMessages: number;
        hasQR: boolean;
    }>;
    getQR(): Promise<{
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
    syncMessages(conversationId: string): Promise<{
        success: boolean;
        message: string;
        syncedCount: number;
    }>;
}
