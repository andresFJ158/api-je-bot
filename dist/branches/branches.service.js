"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BranchesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BranchesService = BranchesService_1 = class BranchesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(BranchesService_1.name);
    }
    async create(createDto) {
        try {
            this.logger.debug(`Creating branch: ${createDto.name}`);
            return await this.prisma.branch.create({
                data: createDto,
            });
        }
        catch (error) {
            this.logger.error(`Error creating branch: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(activeOnly) {
        try {
            this.logger.debug(`Finding branches${activeOnly ? ' (active only)' : ''}`);
            return await this.prisma.branch.findMany({
                where: activeOnly ? { isActive: true } : undefined,
                orderBy: { name: 'asc' },
            });
        }
        catch (error) {
            this.logger.error(`Error finding branches: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
        });
        if (!branch) {
            throw new common_1.NotFoundException('Branch not found');
        }
        return branch;
    }
    async update(id, updateDto) {
        try {
            await this.findOne(id);
            this.logger.debug(`Updating branch: ${id}`);
            return await this.prisma.branch.update({
                where: { id },
                data: updateDto,
            });
        }
        catch (error) {
            this.logger.error(`Error updating branch: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            this.logger.debug(`Deleting branch: ${id}`);
            return await this.prisma.branch.delete({
                where: { id },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting branch: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findNearest(latitude, longitude) {
        try {
            this.logger.debug(`Finding nearest branch to: ${latitude}, ${longitude}`);
            const branches = await this.prisma.branch.findMany({
                where: { isActive: true },
            });
            if (branches.length === 0) {
                return null;
            }
            let nearestBranch = null;
            let minDistance = Infinity;
            for (const branch of branches) {
                const distance = this.calculateDistance(latitude, longitude, branch.latitude, branch.longitude);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestBranch = { ...branch, distance };
                }
            }
            return nearestBranch;
        }
        catch (error) {
            this.logger.error(`Error finding nearest branch: ${error.message}`, error.stack);
            throw error;
        }
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
                Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    async extractCoordinatesFromGoogleMaps(url) {
        try {
            if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
                this.logger.debug(`Resolving short Google Maps link: ${url}`);
                const expandedUrl = await this.resolveShortUrl(url);
                if (expandedUrl) {
                    url = expandedUrl;
                    this.logger.debug(`Expanded URL: ${url}`);
                }
                else {
                    this.logger.warn(`Could not resolve short URL: ${url}`);
                }
            }
            const qParamMatch = url.match(/[?&]q=([^&]+)/);
            if (qParamMatch) {
                const qValue = decodeURIComponent(qParamMatch[1]);
                const coordsMatch = qValue.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                if (coordsMatch) {
                    const lat = parseFloat(coordsMatch[1]);
                    const lng = parseFloat(coordsMatch[2]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        return { latitude: lat, longitude: lng };
                    }
                }
            }
            const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            if (atMatch) {
                const lat = parseFloat(atMatch[1]);
                const lng = parseFloat(atMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }
            const placeMatch = url.match(/place\/[^@]+@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            if (placeMatch) {
                const lat = parseFloat(placeMatch[1]);
                const lng = parseFloat(placeMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }
            const searchMatch = url.match(/[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            if (searchMatch) {
                const lat = parseFloat(searchMatch[1]);
                const lng = parseFloat(searchMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }
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
                }
                catch (error) {
                }
            }
            this.logger.warn(`Could not extract coordinates from URL: ${url}`);
            return null;
        }
        catch (error) {
            this.logger.error(`Error extracting coordinates: ${error.message}`);
            return null;
        }
    }
    async resolveShortUrl(shortUrl) {
        try {
            const response = await fetch(shortUrl, {
                method: 'HEAD',
                redirect: 'follow',
            });
            if (response.ok && response.url) {
                return response.url;
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Error resolving short URL: ${error.message}`);
            return null;
        }
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = BranchesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map