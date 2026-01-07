import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { FindNearestBranchDto } from './dto/find-nearest.dto';
export declare class BranchesController {
    private readonly branchesService;
    private readonly logger;
    constructor(branchesService: BranchesService);
    create(createBranchDto: CreateBranchDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        phone: string | null;
        address: string;
        latitude: number;
        longitude: number;
        openingHours: string | null;
        isActive: boolean;
    }>;
    findAll(activeOnly?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        phone: string | null;
        address: string;
        latitude: number;
        longitude: number;
        openingHours: string | null;
        isActive: boolean;
    }[]>;
    findNearest(query: FindNearestBranchDto): Promise<any>;
    findNearestFromUrl(body: {
        url: string;
    }): Promise<{
        success: boolean;
        message: string;
        coordinates?: undefined;
        branch?: undefined;
    } | {
        success: boolean;
        coordinates: {
            latitude: number;
            longitude: number;
        };
        branch: any;
        message?: undefined;
    }>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        phone: string | null;
        address: string;
        latitude: number;
        longitude: number;
        openingHours: string | null;
        isActive: boolean;
    }>;
    update(id: string, updateBranchDto: UpdateBranchDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        phone: string | null;
        address: string;
        latitude: number;
        longitude: number;
        openingHours: string | null;
        isActive: boolean;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        phone: string | null;
        address: string;
        latitude: number;
        longitude: number;
        openingHours: string | null;
        isActive: boolean;
    }>;
}
