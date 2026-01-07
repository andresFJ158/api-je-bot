export declare enum TransactionType {
    ENTRADA = "ENTRADA",
    SALIDA = "SALIDA"
}
export declare class CreateInventoryTransactionDto {
    productId: string;
    type: TransactionType;
    quantity: number;
    glosa?: string;
    agentId?: string;
}
