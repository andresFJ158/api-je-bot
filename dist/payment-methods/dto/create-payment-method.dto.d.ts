export declare class CreatePaymentMethodDto {
    type: 'QR' | 'BANK_ACCOUNT';
    name: string;
    description?: string;
    qrImageUrl?: string;
    bankName?: string;
    accountNumber?: string;
    accountType?: 'AHORROS' | 'CORRIENTE';
    cci?: string;
    isActive?: boolean;
    order?: number;
}
