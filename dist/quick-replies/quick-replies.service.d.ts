import { PrismaService } from '../prisma/prisma.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
export declare class QuickRepliesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(createDto: CreateQuickReplyDto): Promise<{
        message: string;
        category: string | null;
        order: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
    }>;
    findAll(category?: string): Promise<{
        message: string;
        category: string | null;
        order: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
    }[]>;
    getCategories(): Promise<string[]>;
    findOne(id: string): Promise<{
        message: string;
        category: string | null;
        order: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
    }>;
    update(id: string, updateDto: UpdateQuickReplyDto): Promise<{
        message: string;
        category: string | null;
        order: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
    }>;
    remove(id: string): Promise<{
        message: string;
        category: string | null;
        order: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
    }>;
}
