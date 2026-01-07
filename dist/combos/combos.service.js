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
var CombosService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CombosService = CombosService_1 = class CombosService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CombosService_1.name);
    }
    async create(createDto) {
        try {
            this.logger.debug(`Creating combo: ${createDto.name}`);
            if (createDto.categoryId) {
                const category = await this.prisma.category.findUnique({
                    where: { id: createDto.categoryId },
                });
                if (!category) {
                    throw new common_1.NotFoundException('Categoría no encontrada');
                }
            }
            if (!createDto.items || createDto.items.length === 0) {
                throw new common_1.BadRequestException('Un combo debe tener al menos un producto');
            }
            const productIds = createDto.items.map(item => item.productId);
            const products = await this.prisma.product.findMany({
                where: { id: { in: productIds } },
            });
            if (products.length !== productIds.length) {
                throw new common_1.BadRequestException('Uno o más productos no existen');
            }
            return await this.prisma.combo.create({
                data: {
                    name: createDto.name,
                    description: createDto.description,
                    offerPrice: createDto.offerPrice,
                    categoryId: createDto.categoryId || undefined,
                    isActive: createDto.isActive ?? true,
                    items: {
                        create: createDto.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                        })),
                    },
                },
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
        }
        catch (error) {
            this.logger.error(`Error creating combo: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(categoryId, includeInactive) {
        try {
            this.logger.debug(`Finding combos${categoryId ? ` with categoryId: ${categoryId}` : ''}`);
            return await this.prisma.combo.findMany({
                where: {
                    ...(categoryId && { categoryId }),
                    ...(includeInactive !== true && { isActive: true }),
                },
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
                orderBy: { name: 'asc' },
            });
        }
        catch (error) {
            this.logger.error(`Error finding combos: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        const combo = await this.prisma.combo.findUnique({
            where: { id },
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
        if (!combo) {
            throw new common_1.NotFoundException('Combo no encontrado');
        }
        return combo;
    }
    async update(id, updateDto) {
        try {
            await this.findOne(id);
            if (updateDto.categoryId) {
                const category = await this.prisma.category.findUnique({
                    where: { id: updateDto.categoryId },
                });
                if (!category) {
                    throw new common_1.NotFoundException('Categoría no encontrada');
                }
            }
            if (updateDto.items) {
                if (updateDto.items.length === 0) {
                    throw new common_1.BadRequestException('Un combo debe tener al menos un producto');
                }
                const productIds = updateDto.items.map(item => item.productId);
                const products = await this.prisma.product.findMany({
                    where: { id: { in: productIds } },
                });
                if (products.length !== productIds.length) {
                    throw new common_1.BadRequestException('Uno o más productos no existen');
                }
            }
            this.logger.debug(`Updating combo: ${id}`);
            const { items, ...updateData } = updateDto;
            if (items) {
                await this.prisma.comboItem.deleteMany({
                    where: { comboId: id },
                });
            }
            return await this.prisma.combo.update({
                where: { id },
                data: {
                    ...updateData,
                    ...(items && {
                        items: {
                            create: items.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                            })),
                        },
                    }),
                },
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
        }
        catch (error) {
            this.logger.error(`Error updating combo: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            this.logger.debug(`Deleting combo: ${id}`);
            return await this.prisma.combo.delete({
                where: { id },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting combo: ${error.message}`, error.stack);
            throw error;
        }
    }
    async calculateTotalPrice(comboId) {
        const combo = await this.findOne(comboId);
        let total = 0;
        for (const item of combo.items) {
            total += item.product.price * item.quantity;
        }
        return total;
    }
    async getSavings(comboId) {
        const combo = await this.findOne(comboId);
        const totalPrice = await this.calculateTotalPrice(comboId);
        return totalPrice - combo.offerPrice;
    }
};
exports.CombosService = CombosService;
exports.CombosService = CombosService = CombosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CombosService);
//# sourceMappingURL=combos.service.js.map