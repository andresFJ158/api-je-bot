import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    private readonly logger;
    constructor(categoriesService: CategoriesService);
    createCategory(createCategoryDto: CreateCategoryDto): Promise<{
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
    updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<{
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
}
