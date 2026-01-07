export declare class CreateOrderItemDto {
    productId: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
}
export declare class CreateOrderDto {
    branchId: string;
    userId?: string;
    discount?: number;
    tax?: number;
    notes?: string;
    items: CreateOrderItemDto[];
}
