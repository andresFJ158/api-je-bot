import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
export declare class QuickRepliesController {
    private readonly quickRepliesService;
    private readonly logger;
    constructor(quickRepliesService: QuickRepliesService);
    create(createQuickReplyDto: CreateQuickReplyDto): Promise<{
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
    update(id: string, updateQuickReplyDto: UpdateQuickReplyDto): Promise<{
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
