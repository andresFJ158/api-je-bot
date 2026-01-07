import { ComboItemDto } from './create-combo.dto';
export declare class UpdateComboDto {
    name?: string;
    description?: string;
    offerPrice?: number;
    categoryId?: string;
    items?: ComboItemDto[];
    isActive?: boolean;
}
