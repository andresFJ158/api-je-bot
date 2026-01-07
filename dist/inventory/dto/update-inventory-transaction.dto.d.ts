import { TransactionType } from './create-inventory-transaction.dto';
export declare class UpdateInventoryTransactionDto {
    productId?: string;
    type?: TransactionType;
    quantity?: number;
    glosa?: string;
    agentId?: string;
}
