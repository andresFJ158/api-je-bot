import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class UpdateBranchDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsNumber()
    @Min(-90)
    @Max(90)
    @IsOptional()
    latitude?: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    @IsOptional()
    longitude?: number;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    openingHours?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

