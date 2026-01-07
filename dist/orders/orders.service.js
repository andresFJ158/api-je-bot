"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
const create_inventory_transaction_dto_1 = require("../inventory/dto/create-inventory-transaction.dto");
const websocket_gateway_1 = require("../websocket/websocket.gateway");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const utils_1 = require("../common/utils");
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, inventoryService, websocketGateway, whatsappService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
        this.websocketGateway = websocketGateway;
        this.whatsappService = whatsappService;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async create(createDto, agentId) {
        try {
            this.logger.debug(`Creating order for branch: ${createDto.branchId}`);
            const branch = await this.prisma.branch.findUnique({
                where: { id: createDto.branchId },
            });
            if (!branch) {
                throw new common_1.NotFoundException('Sucursal no encontrada');
            }
            if (!branch.isActive) {
                throw new common_1.BadRequestException('La sucursal no está activa');
            }
            if (createDto.userId) {
                const user = await this.prisma.user.findUnique({
                    where: { id: createDto.userId },
                });
                if (!user) {
                    throw new common_1.NotFoundException('Cliente no encontrado');
                }
            }
            const orderItems = [];
            let subtotal = 0;
            for (const itemDto of createDto.items) {
                const product = await this.prisma.product.findUnique({
                    where: { id: itemDto.productId },
                });
                if (!product) {
                    throw new common_1.NotFoundException(`Producto no encontrado: ${itemDto.productId}`);
                }
                if (product.stock < itemDto.quantity) {
                    throw new common_1.BadRequestException(`Stock insuficiente para el producto ${product.name}. Stock disponible: ${product.stock}, solicitado: ${itemDto.quantity}`);
                }
                const unitPrice = itemDto.unitPrice ?? product.price;
                const itemDiscount = itemDto.discount ?? 0;
                const itemSubtotal = itemDto.quantity * unitPrice - itemDiscount;
                orderItems.push({
                    productId: itemDto.productId,
                    quantity: itemDto.quantity,
                    unitPrice,
                    discount: itemDiscount,
                    subtotal: itemSubtotal,
                });
                subtotal += itemSubtotal;
            }
            if (orderItems.length === 0) {
                throw new common_1.BadRequestException('El pedido debe tener al menos un item');
            }
            const discount = createDto.discount ?? 0;
            const tax = createDto.tax ?? 0;
            const total = subtotal - discount + tax;
            const order = await this.prisma.order.create({
                data: {
                    branchId: createDto.branchId,
                    userId: createDto.userId,
                    agentId,
                    subtotal,
                    discount,
                    tax,
                    total,
                    notes: createDto.notes,
                    items: {
                        create: orderItems,
                    },
                },
                include: {
                    branch: true,
                    user: true,
                    agent: true,
                    items: {
                        include: {
                            product: {
                                include: {
                                    category: true,
                                },
                            },
                        },
                    },
                },
            });
            for (const item of orderItems) {
                await this.inventoryService.createTransaction({
                    productId: item.productId,
                    type: create_inventory_transaction_dto_1.TransactionType.SALIDA,
                    quantity: item.quantity,
                    glosa: 'venta pos',
                    agentId,
                });
            }
            this.websocketGateway.broadcastNewOrder(order);
            this.logger.log(`Order created successfully: ${order.id}`);
            return order;
        }
        catch (error) {
            this.logger.error(`Error creating order: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(filters) {
        try {
            this.logger.debug('Finding all orders');
            const where = {};
            if (filters?.branchId) {
                where.branchId = filters.branchId;
            }
            if (filters?.userId) {
                where.userId = filters.userId;
            }
            if (filters?.status) {
                where.status = filters.status;
            }
            if (filters?.startDate || filters?.endDate) {
                where.createdAt = {};
                if (filters.startDate) {
                    where.createdAt.gte = filters.startDate;
                }
                if (filters.endDate) {
                    where.createdAt.lte = filters.endDate;
                }
            }
            return await this.prisma.order.findMany({
                where,
                include: {
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            lastName: true,
                            phone: true,
                        },
                    },
                    agent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    items: {
                        include: {
                            product: {
                                include: {
                                    category: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        }
        catch (error) {
            this.logger.error(`Error finding orders: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                branch: true,
                user: true,
                agent: true,
                items: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            },
                        },
                    },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Pedido no encontrado');
        }
        return order;
    }
    async update(id, updateDto) {
        try {
            const order = await this.findOne(id);
            if (order.status === 'COMPLETADO') {
                throw new common_1.BadRequestException('No se puede modificar un pedido completado');
            }
            if (order.status === 'CANCELADO') {
                throw new common_1.BadRequestException('No se puede modificar un pedido cancelado');
            }
            let subtotal = order.subtotal;
            let discount = updateDto.discount ?? order.discount;
            let tax = updateDto.tax ?? order.tax;
            let total = subtotal - discount + tax;
            this.logger.debug(`Updating order: ${id}`);
            const updatedOrder = await this.prisma.order.update({
                where: { id },
                data: {
                    status: updateDto.status,
                    discount,
                    tax,
                    total,
                    notes: updateDto.notes,
                },
                include: {
                    branch: true,
                    user: true,
                    agent: true,
                    items: {
                        include: {
                            product: {
                                include: {
                                    category: true,
                                },
                            },
                        },
                    },
                },
            });
            this.websocketGateway.broadcastNewOrder(updatedOrder);
            if (updateDto.status && updateDto.status !== order.status && updatedOrder.user?.phone) {
                const botConfig = await this.prisma.botConfig.findFirst();
                if (botConfig?.notifyOrderStatusChanges) {
                    await this.sendStatusNotification(updatedOrder);
                }
            }
            return updatedOrder;
        }
        catch (error) {
            this.logger.error(`Error updating order: ${error.message}`, error.stack);
            throw error;
        }
    }
    async cancel(id, agentId) {
        try {
            const order = await this.findOne(id);
            if (order.status === 'COMPLETADO') {
                throw new common_1.BadRequestException('No se puede cancelar un pedido completado');
            }
            if (order.status === 'CANCELADO') {
                throw new common_1.BadRequestException('El pedido ya está cancelado');
            }
            this.logger.debug(`Cancelling order: ${id}`);
            if (order.items && order.items.length > 0) {
                for (const item of order.items) {
                    await this.inventoryService.createTransaction({
                        productId: item.productId,
                        type: create_inventory_transaction_dto_1.TransactionType.ENTRADA,
                        quantity: item.quantity,
                        glosa: `Cancelación de pedido ${order.id.substring(0, 8)}`,
                        agentId: agentId,
                    });
                }
                this.logger.debug(`Reverted inventory for ${order.items.length} items`);
            }
            const cancelledOrder = await this.prisma.order.update({
                where: { id },
                data: {
                    status: 'CANCELADO',
                },
                include: {
                    branch: true,
                    user: true,
                    agent: true,
                    items: {
                        include: {
                            product: {
                                include: {
                                    category: true,
                                },
                            },
                        },
                    },
                },
            });
            this.websocketGateway.broadcastNewOrder(cancelledOrder);
            if (cancelledOrder.user?.phone) {
                const botConfig = await this.prisma.botConfig.findFirst();
                if (botConfig?.notifyOrderStatusChanges) {
                    await this.sendStatusNotification(cancelledOrder);
                }
            }
            this.logger.log(`Order cancelled successfully: ${id}`);
            return cancelledOrder;
        }
        catch (error) {
            this.logger.error(`Error cancelling order: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            const order = await this.findOne(id);
            if (order.status !== 'PENDIENTE_DE_PAGO' && order.status !== 'CANCELADO') {
                throw new common_1.BadRequestException('Solo se pueden eliminar pedidos pendientes de pago o cancelados');
            }
            this.logger.debug(`Deleting order: ${id}`);
            return await this.prisma.order.delete({
                where: { id },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting order: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getStats(branchId, startDate, endDate) {
        try {
            const where = {};
            if (branchId) {
                where.branchId = branchId;
            }
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = startDate;
                }
                if (endDate) {
                    where.createdAt.lte = endDate;
                }
            }
            const [totalOrders, totalRevenue, completedOrders, pendingOrders] = await Promise.all([
                this.prisma.order.count({ where }),
                this.prisma.order.aggregate({
                    where: { ...where, status: 'COMPLETADO' },
                    _sum: { total: true },
                }),
                this.prisma.order.count({ where: { ...where, status: 'COMPLETADO' } }),
                this.prisma.order.count({ where: { ...where, status: 'PENDIENTE_DE_PAGO' } }),
            ]);
            return {
                totalOrders,
                totalRevenue: totalRevenue._sum.total ?? 0,
                completedOrders,
                pendingOrders,
                averageOrderValue: completedOrders > 0 ? (totalRevenue._sum.total ?? 0) / completedOrders : 0,
            };
        }
        catch (error) {
            this.logger.error(`Error getting stats: ${error.message}`, error.stack);
            throw error;
        }
    }
    async sendStatusNotification(order) {
        try {
            if (!order.user?.phone) {
                this.logger.debug(`No phone number available for order ${order.id}`);
                return;
            }
            const phone = (0, utils_1.normalizePhoneNumber)(order.user.phone);
            if (!phone || phone.length < 8) {
                this.logger.warn(`Invalid phone number for order ${order.id}: ${order.user.phone}`);
                return;
            }
            const statusMessages = {
                PENDIENTE_DE_PAGO: `🛒 *Pedido Pendiente de Pago*\n\nTu pedido #${order.id.substring(0, 8)} está pendiente de pago.\n\nTotal: Bs. ${order.total.toFixed(2)}\n\nPor favor, realiza el pago para procesar tu pedido.`,
                PAGO_RECIBIDO: `✅ *Pago Recibido*\n\nHemos recibido el pago de tu pedido #${order.id.substring(0, 8)}.\n\nTotal pagado: Bs. ${order.total.toFixed(2)}\n\nTu pedido está siendo procesado.`,
                COMPLETADO: `🎉 *Pedido Completado*\n\nTu pedido #${order.id.substring(0, 8)} ha sido completado exitosamente.\n\nTotal: Bs. ${order.total.toFixed(2)}\n\n¡Gracias por tu compra!`,
                CANCELADO: `❌ *Pedido Cancelado*\n\nTu pedido #${order.id.substring(0, 8)} ha sido cancelado.\n\nSi realizaste un pago, será reembolsado según nuestras políticas.`,
            };
            const message = statusMessages[order.status];
            if (!message) {
                this.logger.debug(`No notification message defined for status: ${order.status}`);
                return;
            }
            const sent = await this.whatsappService.sendMessage(phone, message);
            if (sent) {
                this.logger.log(`Status notification sent to ${phone} for order ${order.id}`);
            }
            else {
                this.logger.warn(`Failed to send status notification to ${phone} for order ${order.id}`);
            }
        }
        catch (error) {
            this.logger.error(`Error sending status notification for order ${order.id}: ${error.message}`, error.stack);
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => websocket_gateway_1.WebSocketGateway))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => whatsapp_service_1.WhatsAppService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService,
        websocket_gateway_1.WebSocketGateway,
        whatsapp_service_1.WhatsAppService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map