import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesService {
    private prisma;
    private readonly logger;
    private readonly MAX_DEPTH;
    constructor(prisma: PrismaService);
    private calculateDepth;
    private getCategoryPath;
    createCategory(createDto: CreateCategoryDto): Promise<{
        _count: {
            children: number;
            products: number;
        };
        parent: {
            id: string;
            name: string;
        };
        children: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        parentId: string | null;
    }>;
    findAllCategories(parentId?: string): Promise<({
        _count: {
            children: number;
            products: number;
        };
        parent: {
            id: string;
            name: string;
        };
        children: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        parentId: string | null;
    })[]>;
    findCategoryTree(): Promise<any[]>;
    findOneCategory(id: string): Promise<{
        depth: number;
        _count: {
            children: number;
            products: number;
        };
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
        children: ({
            _count: {
                children: number;
                products: number;
            };
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            parentId: string | null;
        })[];
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        parentId: string | null;
    }>;
    updateCategory(id: string, updateDto: UpdateCategoryDto): Promise<{
        _count: {
            children: number;
            products: number;
        };
        parent: {
            id: string;
            name: string;
        };
        children: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        parentId: string | null;
    }>;
    removeCategory(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        parentId: string | null;
    }>;
    findAllFlat(): Promise<({
        _count: {
            children: number;
            products: number;
        };
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
    })[]>;
}
