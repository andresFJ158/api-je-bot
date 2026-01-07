export declare enum OrderStatus {
    PENDIENTE_DE_PAGO = "PENDIENTE_DE_PAGO",
    PAGO_RECIBIDO = "PAGO_RECIBIDO",
    COMPLETADO = "COMPLETADO",
    CANCELADO = "CANCELADO"
}
export declare class UpdateOrderDto {
    status?: string;
    discount?: number;
    tax?: number;
    notes?: string;
}
