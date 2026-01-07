import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
    private readonly logger = new Logger(BranchesService.name);

    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateBranchDto) {
        try {
            this.logger.debug(`Creating branch: ${createDto.name}`);
            return await this.prisma.branch.create({
                data: createDto,
            });
        } catch (error) {
            this.logger.error(`Error creating branch: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findAll(activeOnly?: boolean) {
        try {
            this.logger.debug(`Finding branches${activeOnly ? ' (active only)' : ''}`);
            return await this.prisma.branch.findMany({
                where: activeOnly ? { isActive: true } : undefined,
                orderBy: { name: 'asc' },
            });
        } catch (error) {
            this.logger.error(`Error finding branches: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findOne(id: string) {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
        });

        if (!branch) {
            throw new NotFoundException('Branch not found');
        }

        return branch;
    }

    async update(id: string, updateDto: UpdateBranchDto) {
        try {
            await this.findOne(id); // Verify branch exists
            this.logger.debug(`Updating branch: ${id}`);
            return await this.prisma.branch.update({
                where: { id },
                data: updateDto,
            });
        } catch (error) {
            this.logger.error(`Error updating branch: ${error.message}`, error.stack);
            throw error;
        }
    }

    async remove(id: string) {
        try {
            await this.findOne(id); // Verify branch exists
            this.logger.debug(`Deleting branch: ${id}`);
            return await this.prisma.branch.delete({
                where: { id },
            });
        } catch (error) {
            this.logger.error(`Error deleting branch: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findNearest(latitude: number, longitude: number) {
        try {
            this.logger.debug(`Finding nearest branch to: ${latitude}, ${longitude}`);

            const branches = await this.prisma.branch.findMany({
                where: { isActive: true },
            });

            if (branches.length === 0) {
                return null;
            }

            // Calculate distance using Haversine formula
            let nearestBranch = null;
            let minDistance = Infinity;

            for (const branch of branches) {
                const distance = this.calculateDistance(
                    latitude,
                    longitude,
                    branch.latitude,
                    branch.longitude,
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestBranch = { ...branch, distance };
                }
            }

            return nearestBranch;
        } catch (error) {
            this.logger.error(`Error finding nearest branch: ${error.message}`, error.stack);
            throw error;
        }
    }

    // Haversine formula to calculate distance between two coordinates in kilometers
    private calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
    ): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    }

    private toRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    // Extract coordinates from Google Maps URL (including short links)
    async extractCoordinatesFromGoogleMaps(url: string): Promise<{ latitude: number; longitude: number } | null> {
        try {
            // Handle short Google Maps links (maps.app.goo.gl)
            if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
                this.logger.debug(`Resolving short Google Maps link: ${url}`);
                const expandedUrl = await this.resolveShortUrl(url);
                if (expandedUrl) {
                    url = expandedUrl;
                    this.logger.debug(`Expanded URL: ${url}`);
                } else {
                    this.logger.warn(`Could not resolve short URL: ${url}`);
                }
            }

            // Pattern 1: https://maps.google.com/?q=lat,lng
            const qParamMatch = url.match(/[?&]q=([^&]+)/);
            if (qParamMatch) {
                const qValue = decodeURIComponent(qParamMatch[1]);
                // Check if q parameter contains coordinates
                const coordsMatch = qValue.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                if (coordsMatch) {
                    const lat = parseFloat(coordsMatch[1]);
                    const lng = parseFloat(coordsMatch[2]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        return { latitude: lat, longitude: lng };
                    }
                }
            }

            // Pattern 2: https://www.google.com/maps/@lat,lng,zoom
            const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            if (atMatch) {
                const lat = parseFloat(atMatch[1]);
                const lng = parseFloat(atMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }

            // Pattern 3: https://www.google.com/maps/place/.../@lat,lng,zoom
            const placeMatch = url.match(/place\/[^@]+@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            if (placeMatch) {
                const lat = parseFloat(placeMatch[1]);
                const lng = parseFloat(placeMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }

            // Pattern 4: https://www.google.com/maps/search/?api=1&query=lat,lng
            const searchMatch = url.match(/[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            if (searchMatch) {
                const lat = parseFloat(searchMatch[1]);
                const lng = parseFloat(searchMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }

            // Pattern 5: Try to extract from data parameter in short links
            const dataMatch = url.match(/[?&]data=([^&]+)/);
            if (dataMatch) {
                try {
                    const decoded = decodeURIComponent(dataMatch[1]);
                    const coordsMatch = decoded.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                    if (coordsMatch) {
                        const lat = parseFloat(coordsMatch[1]);
                        const lng = parseFloat(coordsMatch[2]);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            return { latitude: lat, longitude: lng };
                        }
                    }
                } catch (error) {
                    // Ignore decoding errors
                }
            }

            this.logger.warn(`Could not extract coordinates from URL: ${url}`);
            return null;
        } catch (error) {
            this.logger.error(`Error extracting coordinates: ${error.message}`);
            return null;
        }
    }

    // Resolve short URL to full URL by following redirects
    private async resolveShortUrl(shortUrl: string): Promise<string | null> {
        try {
            // Use fetch to follow redirects
            const response = await fetch(shortUrl, {
                method: 'HEAD',
                redirect: 'follow',
            });

            if (response.ok && response.url) {
                return response.url;
            }

            return null;
        } catch (error) {
            this.logger.error(`Error resolving short URL: ${error.message}`);
            return null;
        }
    }
}

