import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsController {
    private readonly productsService;
    private readonly logger;
    constructor(productsService: ProductsService);
    create(createProductDto: CreateProductDto): Promise<{
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
    }>;
    findAll(categoryId?: string): Promise<({
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
    })[]>;
    findByCategory(categoryId: string): Promise<({
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
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: number;
        stock: number;
        categoryId: string | null;
    }>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<{
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
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        price: number;
        stock: number;
        categoryId: string | null;
    }>;
}
