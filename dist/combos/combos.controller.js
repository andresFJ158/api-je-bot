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
var CombosController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombosController = void 0;
const common_1 = require("@nestjs/common");
const combos_service_1 = require("./combos.service");
const create_combo_dto_1 = require("./dto/create-combo.dto");
const update_combo_dto_1 = require("./dto/update-combo.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let CombosController = CombosController_1 = class CombosController {
    constructor(combosService) {
        this.combosService = combosService;
        this.logger = new common_1.Logger(CombosController_1.name);
    }
    async create(createComboDto) {
        try {
            this.logger.debug(`POST /combos - Creating combo: ${createComboDto.name}`);
            return await this.combosService.create(createComboDto);
        }
        catch (error) {
            this.logger.error(`Error in create: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(categoryId, includeInactive) {
        try {
            this.logger.debug(`GET /combos${categoryId ? `?categoryId=${categoryId}` : ''}`);
            return await this.combosService.findAll(categoryId, includeInactive === 'true');
        }
        catch (error) {
            this.logger.error(`Error in findAll: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        return await this.combosService.findOne(id);
    }
    async getTotalPrice(id) {
        const totalPrice = await this.combosService.calculateTotalPrice(id);
        return { totalPrice };
    }
    async getSavings(id) {
        const savings = await this.combosService.getSavings(id);
        return { savings };
    }
    async update(id, updateComboDto) {
        try {
            this.logger.debug(`PATCH /combos/${id}`);
            return await this.combosService.update(id, updateComboDto);
        }
        catch (error) {
            this.logger.error(`Error in update: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            this.logger.debug(`DELETE /combos/${id}`);
            return await this.combosService.remove(id);
        }
        catch (error) {
            this.logger.error(`Error in remove: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.CombosController = CombosController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_combo_dto_1.CreateComboDto]),
    __metadata("design:returntype", Promise)
], CombosController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('categoryId')),
    __param(1, (0, common_1.Query)('includeInactive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CombosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CombosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/total-price'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CombosController.prototype, "getTotalPrice", null);
__decorate([
    (0, common_1.Get)(':id/savings'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CombosController.prototype, "getSavings", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_combo_dto_1.UpdateComboDto]),
    __metadata("design:returntype", Promise)
], CombosController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CombosController.prototype, "remove", null);
exports.CombosController = CombosController = CombosController_1 = __decorate([
    (0, common_1.Controller)('combos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [combos_service_1.CombosService])
], CombosController);
//# sourceMappingURL=combos.controller.js.map