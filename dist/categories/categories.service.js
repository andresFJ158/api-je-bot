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
var CategoriesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CategoriesService = CategoriesService_1 = class CategoriesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CategoriesService_1.name);
        this.MAX_DEPTH = 5;
    }
    async calculateDepth(categoryId) {
        let depth = 1;
        let currentId = categoryId;
        while (currentId) {
            const category = await this.prisma.category.findUnique({
                where: { id: currentId },
                select: { parentId: true },
            });
            if (!category || !category.parentId) {
                break;
            }
            depth++;
            currentId = category.parentId;
            if (depth > this.MAX_DEPTH) {
                return depth;
            }
        }
        return depth;
    }
    async getCategoryPath(categoryId) {
        const path = [];
        let currentId = categoryId;
        while (currentId) {
            const category = await this.prisma.category.findUnique({
                where: { id: currentId },
                select: { id: true, name: true, parentId: true },
            });
            if (!category)
                break;
            path.unshift(category.id);
            currentId = category.parentId;
        }
        return path;
    }
    async createCategory(createDto) {
        try {
            if (createDto.parentId) {
                const parent = await this.prisma.category.findUnique({
                    where: { id: createDto.parentId },
                });
                if (!parent) {
                    throw new common_1.NotFoundException('Categoría padre no encontrada');
                }
                const parentDepth = await this.calculateDepth(createDto.parentId);
                if (parentDepth >= this.MAX_DEPTH) {
                    throw new common_1.BadRequestException(`No se puede crear una categoría hija. La jerarquía ya alcanzó el nivel máximo de ${this.MAX_DEPTH} niveles.`);
                }
            }
            this.logger.debug(`Creating category: ${createDto.name}${createDto.parentId ? ` (parent: ${createDto.parentId})` : ''}`);
            return await this.prisma.category.create({
                data: {
                    name: createDto.name,
                    description: createDto.description,
                    parentId: createDto.parentId,
                },
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    children: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.BadRequestException('Ya existe una categoría con este nombre en el mismo nivel');
            }
            this.logger.error(`Error creating category: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAllCategories(parentId) {
        try {
            this.logger.debug(`Finding all categories${parentId ? ` with parent: ${parentId}` : ' (root level)'}`);
            return await this.prisma.category.findMany({
                where: parentId ? { parentId } : { parentId: null },
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    children: {
                        select: {
                            id: true,
                            name: true,
                        },
                        orderBy: { name: 'asc' },
                    },
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });
        }
        catch (error) {
            this.logger.error(`Error finding categories: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findCategoryTree() {
        try {
            this.logger.debug('Finding category tree');
            const allCategories = await this.prisma.category.findMany({
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });
            const categoryMap = new Map();
            const rootCategories = [];
            for (const cat of allCategories) {
                const depth = await this.calculateDepth(cat.id);
                categoryMap.set(cat.id, {
                    ...cat,
                    children: [],
                    depth,
                });
            }
            for (const cat of allCategories) {
                const categoryNode = categoryMap.get(cat.id);
                if (cat.parentId) {
                    const parent = categoryMap.get(cat.parentId);
                    if (parent) {
                        parent.children.push(categoryNode);
                    }
                }
                else {
                    rootCategories.push(categoryNode);
                }
            }
            return rootCategories;
        }
        catch (error) {
            this.logger.error(`Error finding category tree: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOneCategory(id) {
        const category = await this.prisma.category.findUnique({
            where: { id },
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
                children: {
                    orderBy: { name: 'asc' },
                    include: {
                        _count: {
                            select: {
                                products: true,
                                children: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        products: true,
                        children: true,
                    },
                },
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Categoría no encontrada');
        }
        const depth = await this.calculateDepth(id);
        return {
            ...category,
            depth,
        };
    }
    async updateCategory(id, updateDto) {
        try {
            const existingCategory = await this.findOneCategory(id);
            if (updateDto.parentId !== undefined) {
                if (updateDto.parentId === id) {
                    throw new common_1.BadRequestException('Una categoría no puede ser su propio padre');
                }
                if (updateDto.parentId) {
                    const newParent = await this.prisma.category.findUnique({
                        where: { id: updateDto.parentId },
                    });
                    if (!newParent) {
                        throw new common_1.NotFoundException('Categoría padre no encontrada');
                    }
                    const newParentPath = await this.getCategoryPath(updateDto.parentId);
                    if (newParentPath.includes(id)) {
                        throw new common_1.BadRequestException('No se puede crear un ciclo en la jerarquía de categorías');
                    }
                    const newParentDepth = await this.calculateDepth(updateDto.parentId);
                    if (newParentDepth >= this.MAX_DEPTH) {
                        throw new common_1.BadRequestException(`No se puede mover la categoría aquí. La jerarquía ya alcanzó el nivel máximo de ${this.MAX_DEPTH} niveles.`);
                    }
                }
            }
            this.logger.debug(`Updating category: ${id}`);
            return await this.prisma.category.update({
                where: { id },
                data: updateDto,
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    children: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.BadRequestException('Ya existe una categoría con este nombre en el mismo nivel');
            }
            this.logger.error(`Error updating category: ${error.message}`, error.stack);
            throw error;
        }
    }
    async removeCategory(id) {
        try {
            const category = await this.findOneCategory(id);
            const childrenCount = await this.prisma.category.count({
                where: { parentId: id },
            });
            if (childrenCount > 0) {
                throw new common_1.BadRequestException(`No se puede eliminar la categoría porque tiene ${childrenCount} categoría(s) hija(s). Elimine primero las categorías hijas.`);
            }
            const productsCount = await this.prisma.product.count({
                where: { categoryId: id },
            });
            if (productsCount > 0) {
                throw new common_1.BadRequestException(`No se puede eliminar la categoría porque tiene ${productsCount} producto(s) asociado(s).`);
            }
            this.logger.debug(`Deleting category: ${id}`);
            return await this.prisma.category.delete({
                where: { id },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting category: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAllFlat() {
        try {
            this.logger.debug('Finding all categories (flat)');
            return await this.prisma.category.findMany({
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            products: true,
                            children: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });
        }
        catch (error) {
            this.logger.error(`Error finding flat categories: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = CategoriesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map