import { IsString, IsNumber, IsOptional, IsBoolean, IsNotEmpty, Min, Max } from 'class-validator';

export class CreateBranchDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

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

