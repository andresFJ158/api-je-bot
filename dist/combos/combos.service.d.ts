import { PrismaService } from '../prisma/prisma.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
export declare class CombosService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(createDto: CreateComboDto): Promise<{
        category: {
            parent: {
                parent: {
                    parent: {
                        parent: {
                            id: string;
                            name: string;
                        };
                    } & {
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        parentId: string | null;
                    };
                } & {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    parentId: string | null;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                parentId: string | null;
            };
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            parentId: string | null;
        };
        items: ({
            product: {
                category: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    parentId: string | null;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string;
                price: number;
                stock: number;
                categoryId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            comboId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        categoryId: string | null;
        offerPrice: number;
    }>;
    findAll(categoryId?: string, includeInactive?: boolean): Promise<({
        category: {
            parent: {
                parent: {
                    parent: {
                        parent: {
                            id: string;
                            name: string;
                        };
                    } & {
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        parentId: string | null;
                    };
                } & {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    parentId: string | null;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                parentId: string | null;
            };
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            parentId: string | null;
        };
        items: ({
            product: {
                category: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    parentId: string | null;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string;
                price: number;
                stock: number;
                categoryId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            comboId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        categoryId: string | null;
        offerPrice: number;
    })[]>;
    findOne(id: string): Promise<{
        category: {
            parent: {
                parent: {
                    parent: {
                        parent: {
                            id: string;
                            name: string;
                        };
                    } & {
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        parentId: string | null;
                    };
                } & {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    parentId: string | null;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                parentId: string | null;
            };
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            parentId: string | null;
        };
        items: ({
            product: {
                category: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    parentId: string | null;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string;
                price: number;
                stock: number;
                categoryId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            comboId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        categoryId: string | null;
        offerPrice: number;
    }>;
    update(id: string, updateDto: UpdateComboDto): Promise<{
        category: {
            parent: {
                parent: {
                    parent: {
                        parent: {
                            id: string;
                            name: string;
                        };
                    } & {
                        id: string;
                        name: string;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        parentId: string | null;
                    };
                } & {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    parentId: string | null;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                parentId: string | null;
            };
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            parentId: string | null;
        };
        items: ({
            product: {
                category: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    parentId: string | null;
                };
            } & {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string;
                price: number;
                stock: number;
                categoryId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            comboId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        categoryId: string | null;
        offerPrice: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        categoryId: string | null;
        offerPrice: number;
    }>;
    calculateTotalPrice(comboId: string): Promise<number>;
    getSavings(comboId: string): Promise<number>;
}
