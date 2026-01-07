export declare class ComboItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateComboDto {
    name: string;
    description: string;
    offerPrice: number;
    categoryId?: string;
    items: ComboItemDto[];
    isActive?: boolean;
}
