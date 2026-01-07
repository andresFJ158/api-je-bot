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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BranchesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchesController = void 0;
const common_1 = require("@nestjs/common");
const branches_service_1 = require("./branches.service");
const create_branch_dto_1 = require("./dto/create-branch.dto");
const update_branch_dto_1 = require("./dto/update-branch.dto");
const find_nearest_dto_1 = require("./dto/find-nearest.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let BranchesController = BranchesController_1 = class BranchesController {
    constructor(branchesService) {
        this.branchesService = branchesService;
        this.logger = new common_1.Logger(BranchesController_1.name);
    }
    async create(createBranchDto) {
        try {
            this.logger.debug(`POST /branches - Creating branch: ${createBranchDto.name}`);
            return await this.branchesService.create(createBranchDto);
        }
        catch (error) {
            this.logger.error(`Error in create: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(activeOnly) {
        try {
            this.logger.debug(`GET /branches${activeOnly ? '?activeOnly=true' : ''}`);
            return await this.branchesService.findAll(activeOnly === 'true');
        }
        catch (error) {
            this.logger.error(`Error in findAll: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findNearest(query) {
        try {
            this.logger.debug(`GET /branches/nearest - lat: ${query.latitude}, lng: ${query.longitude}`);
            return await this.branchesService.findNearest(query.latitude, query.longitude);
        }
        catch (error) {
            this.logger.error(`Error in findNearest: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findNearestFromUrl(body) {
        try {
            this.logger.debug(`POST /branches/nearest-from-url - URL: ${body.url}`);
            const coords = await this.branchesService.extractCoordinatesFromGoogleMaps(body.url);
            if (!coords) {
                return {
                    success: false,
                    message: 'No se pudieron extraer las coordenadas del enlace de Google Maps. Asegúrate de que el enlace sea válido.',
                };
            }
            this.logger.debug(`Extracted coordinates: ${coords.latitude}, ${coords.longitude}`);
            const nearest = await this.branchesService.findNearest(coords.latitude, coords.longitude);
            return {
                success: true,
                coordinates: coords,
                branch: nearest,
            };
        }
        catch (error) {
            this.logger.error(`Error in findNearestFromUrl: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        return await this.branchesService.findOne(id);
    }
    async update(id, updateBranchDto) {
        try {
            this.logger.debug(`PATCH /branches/${id}`);
            return await this.branchesService.update(id, updateBranchDto);
        }
        catch (error) {
            this.logger.error(`Error in update: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            this.logger.debug(`DELETE /branches/${id}`);
            return await this.branchesService.remove(id);
        }
        catch (error) {
            this.logger.error(`Error in remove: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.BranchesController = BranchesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_branch_dto_1.CreateBranchDto]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('nearest'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [find_nearest_dto_1.FindNearestBranchDto]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findNearest", null);
__decorate([
    (0, common_1.Post)('nearest-from-url'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findNearestFromUrl", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_branch_dto_1.UpdateBranchDto]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "remove", null);
exports.BranchesController = BranchesController = BranchesController_1 = __decorate([
    (0, common_1.Controller)('branches'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [branches_service_1.BranchesService])
], BranchesController);
//# sourceMappingURL=branches.controller.js.map