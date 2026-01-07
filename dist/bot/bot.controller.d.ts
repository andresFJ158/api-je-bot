import { BotService } from './bot.service';
import { UpdateBotConfigDto } from './dto/update-bot-config.dto';
export declare class BotController {
    private botService;
    private readonly logger;
    constructor(botService: BotService);
    getConfig(): Promise<{
        id: string;
        updatedAt: Date;
        systemPrompt: string;
        temperature: number;
        maxTokens: number;
        model: string;
        contextMessages: number;
        classificationCategories: string[];
        orderInstructions: string | null;
        locationInstructions: string | null;
        locationKeywords: string | null;
        autoCreateOrderOnPaymentRequest: boolean;
        autoSendQRImages: boolean;
        notifyOrderStatusChanges: boolean;
        findNearestBranchOnLocationShare: boolean;
        showLocationInstructions: boolean;
        prepareOrderInsteadOfCreate: boolean;
        extractOrderFromContext: boolean;
        updatedBy: string | null;
    }>;
    updateConfig(updateDto: UpdateBotConfigDto): Promise<{
        id: string;
        updatedAt: Date;
        systemPrompt: string;
        temperature: number;
        maxTokens: number;
        model: string;
        contextMessages: number;
        classificationCategories: string[];
        orderInstructions: string | null;
        locationInstructions: string | null;
        locationKeywords: string | null;
        autoCreateOrderOnPaymentRequest: boolean;
        autoSendQRImages: boolean;
        notifyOrderStatusChanges: boolean;
        findNearestBranchOnLocationShare: boolean;
        showLocationInstructions: boolean;
        prepareOrderInsteadOfCreate: boolean;
        extractOrderFromContext: boolean;
        updatedBy: string | null;
    }>;
}
