import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
export declare class AgentsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        email: string;
        id: string;
        name: string;
        role: string;
        online: boolean;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        id: string;
        name: string;
        role: string;
        online: boolean;
        createdAt: Date;
    }>;
    create(createDto: CreateAgentDto): Promise<{
        email: string;
        id: string;
        name: string;
        role: string;
        online: boolean;
        createdAt: Date;
    }>;
    updateOnlineStatus(id: string, online: boolean): Promise<{
        email: string;
        id: string;
        name: string;
        role: string;
        online: boolean;
    }>;
}
