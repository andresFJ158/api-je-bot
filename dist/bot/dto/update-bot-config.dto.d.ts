export declare class UpdateBotConfigDto {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    contextMessages?: number;
    classificationCategories?: string[];
    orderInstructions?: string;
    locationInstructions?: string;
    locationKeywords?: string;
    autoCreateOrderOnPaymentRequest?: boolean;
    autoSendQRImages?: boolean;
    notifyOrderStatusChanges?: boolean;
    findNearestBranchOnLocationShare?: boolean;
    showLocationInstructions?: boolean;
    prepareOrderInsteadOfCreate?: boolean;
    extractOrderFromContext?: boolean;
}
