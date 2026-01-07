import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
export declare class InventoryService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createTransaction(createDto: CreateInventoryTransactionDto): Promise<{
        agent: {
            email: string;
            password: string;
            id: string;
            name: string;
            role: string;
            online: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        product: {
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
        agentId: string | null;
        productId: string;
        quantity: number;
        type: string;
        glosa: string | null;
    }>;
    findAllTransactions(productId?: string, type?: string, agentId?: string): Promise<({
        agent: {
            email: string;
            password: string;
            id: string;
            name: string;
            role: string;
            online: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        product: {
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
        agentId: string | null;
        productId: string;
        quantity: number;
        type: string;
        glosa: string | null;
    })[]>;
    findOneTransaction(id: string): Promise<{
        agent: {
            email: string;
            password: string;
            id: string;
            name: string;
            role: string;
            online: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        product: {
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
        agentId: string | null;
        productId: string;
        quantity: number;
        type: string;
        glosa: string | null;
    }>;
    updateTransaction(id: string, updateDto: UpdateInventoryTransactionDto): Promise<{
        agent: {
            email: string;
            password: string;
            id: string;
            name: string;
            role: string;
            online: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        product: {
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
        agentId: string | null;
        productId: string;
        quantity: number;
        type: string;
        glosa: string | null;
    }>;
    removeTransaction(id: string): Promise<{
        id: string;
        createdAt: Date;
        agentId: string | null;
        productId: string;
        quantity: number;
        type: string;
        glosa: string | null;
    }>;
    getInventorySummary(): Promise<{
        totalProducts: number;
        lowStockProducts: number;
        outOfStockProducts: number;
        totalStockValue: number;
        products: ({
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
            _count: {
                transactions: number;
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
        })[];
    }>;
}
