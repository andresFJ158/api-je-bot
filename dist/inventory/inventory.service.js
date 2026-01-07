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
var InventoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InventoryService = InventoryService_1 = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(InventoryService_1.name);
    }
    async createTransaction(createDto) {
        try {
            const product = await this.prisma.product.findUnique({
                where: { id: createDto.productId },
            });
            if (!product) {
                throw new common_1.NotFoundException('Producto no encontrado');
            }
            if (createDto.agentId) {
                const agent = await this.prisma.agent.findUnique({
                    where: { id: createDto.agentId },
                });
                if (!agent) {
                    throw new common_1.NotFoundException('Agente no encontrado');
                }
            }
            if (createDto.type === 'SALIDA') {
                if (product.stock < createDto.quantity) {
                    throw new common_1.BadRequestException(`Stock insuficiente. Stock disponible: ${product.stock}, solicitado: ${createDto.quantity}`);
                }
            }
            let glosa = createDto.glosa;
            if (!glosa) {
                glosa = createDto.type === 'ENTRADA' ? 'Reposición stock' : null;
            }
            const result = await this.prisma.$transaction(async (tx) => {
                const transaction = await tx.inventoryTransaction.create({
                    data: {
                        productId: createDto.productId,
                        type: createDto.type,
                        quantity: createDto.quantity,
                        glosa: glosa,
                        agentId: createDto.agentId,
                    },
                    include: {
                        product: {
                            include: {
                                category: {
                                    include: {
                                        parent: {
                                            include: {
                                                parent: {
                                                    include: {
                                                        parent: {
                                                            include: {
                                                                parent: {
                                                                    select: {
                                                                        id: true,
                                                                        name: true,
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        agent: true,
                    },
                });
                const stockChange = createDto.type === 'ENTRADA' ? createDto.quantity : -createDto.quantity;
                await tx.product.update({
                    where: { id: createDto.productId },
                    data: {
                        stock: {
                            increment: stockChange,
                        },
                    },
                });
                return transaction;
            });
            this.logger.debug(`Created ${createDto.type} transaction for product ${createDto.productId}, quantity: ${createDto.quantity}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error creating transaction: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAllTransactions(productId, type, agentId) {
        try {
            this.logger.debug(`Finding transactions${productId ? ` for product: ${productId}` : ''}${type ? ` type: ${type}` : ''}`);
            return await this.prisma.inventoryTransaction.findMany({
                where: {
                    ...(productId && { productId }),
                    ...(type && { type }),
                    ...(agentId && { agentId }),
                },
                include: {
                    product: {
                        include: {
                            category: {
                                include: {
                                    parent: {
                                        include: {
                                            parent: {
                                                include: {
                                                    parent: {
                                                        include: {
                                                            parent: {
                                                                select: {
                                                                    id: true,
                                                                    name: true,
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    agent: true,
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        catch (error) {
            this.logger.error(`Error finding transactions: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOneTransaction(id) {
        const transaction = await this.prisma.inventoryTransaction.findUnique({
            where: { id },
            include: {
                product: {
                    include: {
                        category: {
                            include: {
                                parent: {
                                    include: {
                                        parent: {
                                            include: {
                                                parent: {
                                                    include: {
                                                        parent: {
                                                            select: {
                                                                id: true,
                                                                name: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                agent: true,
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transacción no encontrada');
        }
        return transaction;
    }
    async updateTransaction(id, updateDto) {
        try {
            const existingTransaction = await this.findOneTransaction(id);
            if (updateDto.quantity !== undefined || updateDto.type !== undefined) {
                const product = await this.prisma.product.findUnique({
                    where: { id: existingTransaction.productId },
                });
                if (!product) {
                    throw new common_1.NotFoundException('Producto no encontrado');
                }
                const oldStockChange = existingTransaction.type === 'ENTRADA'
                    ? existingTransaction.quantity
                    : -existingTransaction.quantity;
                const newType = updateDto.type || existingTransaction.type;
                const newQuantity = updateDto.quantity || existingTransaction.quantity;
                const newStockChange = newType === 'ENTRADA' ? newQuantity : -newQuantity;
                const currentStock = product.stock - oldStockChange;
                if (newType === 'SALIDA' && currentStock < newQuantity) {
                    throw new common_1.BadRequestException(`Stock insuficiente. Stock disponible: ${currentStock}, solicitado: ${newQuantity}`);
                }
                return await this.prisma.$transaction(async (tx) => {
                    await tx.product.update({
                        where: { id: existingTransaction.productId },
                        data: {
                            stock: {
                                increment: -oldStockChange,
                            },
                        },
                    });
                    await tx.product.update({
                        where: { id: existingTransaction.productId },
                        data: {
                            stock: {
                                increment: newStockChange,
                            },
                        },
                    });
                    const updatedTransaction = await tx.inventoryTransaction.update({
                        where: { id },
                        data: {
                            ...updateDto,
                            glosa: updateDto.glosa !== undefined
                                ? (updateDto.glosa || (newType === 'ENTRADA' ? 'Reposición stock' : null))
                                : undefined,
                        },
                        include: {
                            product: {
                                include: {
                                    category: {
                                        include: {
                                            parent: {
                                                include: {
                                                    parent: {
                                                        include: {
                                                            parent: {
                                                                include: {
                                                                    parent: {
                                                                        select: {
                                                                            id: true,
                                                                            name: true,
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            agent: true,
                        },
                    });
                    return updatedTransaction;
                });
            }
            else {
                return await this.prisma.inventoryTransaction.update({
                    where: { id },
                    data: updateDto,
                    include: {
                        product: {
                            include: {
                                category: {
                                    include: {
                                        parent: {
                                            include: {
                                                parent: {
                                                    include: {
                                                        parent: {
                                                            include: {
                                                                parent: {
                                                                    select: {
                                                                        id: true,
                                                                        name: true,
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        agent: true,
                    },
                });
            }
        }
        catch (error) {
            this.logger.error(`Error updating transaction: ${error.message}`, error.stack);
            throw error;
        }
    }
    async removeTransaction(id) {
        try {
            const transaction = await this.findOneTransaction(id);
            return await this.prisma.$transaction(async (tx) => {
                const stockChange = transaction.type === 'ENTRADA'
                    ? -transaction.quantity
                    : transaction.quantity;
                await tx.product.update({
                    where: { id: transaction.productId },
                    data: {
                        stock: {
                            increment: stockChange,
                        },
                    },
                });
                return await tx.inventoryTransaction.delete({
                    where: { id },
                });
            });
        }
        catch (error) {
            this.logger.error(`Error deleting transaction: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getInventorySummary() {
        try {
            this.logger.debug('Getting inventory summary');
            const products = await this.prisma.product.findMany({
                include: {
                    category: {
                        include: {
                            parent: {
                                include: {
                                    parent: {
                                        include: {
                                            parent: {
                                                include: {
                                                    parent: {
                                                        select: {
                                                            id: true,
                                                            name: true,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            transactions: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });
            const totalProducts = products.length;
            const lowStockProducts = products.filter((p) => p.stock < 10).length;
            const outOfStockProducts = products.filter((p) => p.stock === 0).length;
            const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);
            return {
                totalProducts,
                lowStockProducts,
                outOfStockProducts,
                totalStockValue,
                products,
            };
        }
        catch (error) {
            this.logger.error(`Error getting inventory summary: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = InventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map