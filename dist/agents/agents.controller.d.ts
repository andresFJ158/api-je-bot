import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
export declare class AgentsController {
    private agentsService;
    private readonly logger;
    constructor(agentsService: AgentsService);
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
    updateOnlineStatus(id: string, body: {
        online: boolean;
    }): Promise<{
        email: string;
        id: string;
        name: string;
        role: string;
        online: boolean;
    }>;
}
