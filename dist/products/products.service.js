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
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductsService = ProductsService_1 = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ProductsService_1.name);
    }
    async create(createDto) {
        try {
            this.logger.debug(`Creating product: ${createDto.name}`);
            if (createDto.categoryId) {
                const category = await this.prisma.category.findUnique({
                    where: { id: createDto.categoryId },
                });
                if (!category) {
                    throw new common_1.NotFoundException('Categoría no encontrada');
                }
            }
            return await this.prisma.product.create({
                data: {
                    name: createDto.name,
                    price: createDto.price,
                    description: createDto.description,
                    stock: 0,
                    categoryId: createDto.categoryId || undefined,
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
                },
            });
        }
        catch (error) {
            this.logger.error(`Error creating product: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(categoryId) {
        try {
            this.logger.debug(`Finding products${categoryId ? ` with categoryId: ${categoryId}` : ''}`);
            return await this.prisma.product.findMany({
                where: {
                    ...(categoryId && { categoryId }),
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
                },
                orderBy: { name: 'asc' },
            });
        }
        catch (error) {
            this.logger.error(`Error finding products: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        const product = await this.prisma.product.findUnique({
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
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
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
            this.logger.debug(`Updating product: ${id}`);
            const { stock, ...updateData } = updateDto;
            return await this.prisma.product.update({
                where: { id },
                data: updateData,
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
            });
        }
        catch (error) {
            this.logger.error(`Error updating product: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            this.logger.debug(`Deleting product: ${id}`);
            return await this.prisma.product.delete({
                where: { id },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting product: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findByCategory(categoryId) {
        try {
            this.logger.debug(`Finding products by category: ${categoryId}`);
            return await this.prisma.product.findMany({
                where: { categoryId },
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
                orderBy: { name: 'asc' },
            });
        }
        catch (error) {
            this.logger.error(`Error finding products by category: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map