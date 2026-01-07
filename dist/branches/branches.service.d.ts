import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
export declare class BranchesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(createDto: CreateBranchDto): Promise<{
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
    findAll(activeOnly?: boolean): Promise<{
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
    update(id: string, updateDto: UpdateBranchDto): Promise<{
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
    findNearest(latitude: number, longitude: number): Promise<any>;
    private calculateDistance;
    private toRad;
    extractCoordinatesFromGoogleMaps(url: string): Promise<{
        latitude: number;
        longitude: number;
    } | null>;
    private resolveShortUrl;
}
