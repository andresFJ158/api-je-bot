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
var CategoriesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesController = void 0;
const common_1 = require("@nestjs/common");
const categories_service_1 = require("./categories.service");
const create_category_dto_1 = require("./dto/create-category.dto");
const update_category_dto_1 = require("./dto/update-category.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let CategoriesController = CategoriesController_1 = class CategoriesController {
    constructor(categoriesService) {
        this.categoriesService = categoriesService;
        this.logger = new common_1.Logger(CategoriesController_1.name);
    }
    async createCategory(createCategoryDto) {
        try {
            this.logger.debug(`POST /categories - Creating category: ${createCategoryDto.name}`);
            return await this.categoriesService.createCategory(createCategoryDto);
        }
        catch (error) {
            this.logger.error(`Error in createCategory: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAllCategories(parentId) {
        try {
            this.logger.debug(`GET /categories${parentId ? `?parentId=${parentId}` : ''}`);
            return await this.categoriesService.findAllCategories(parentId);
        }
        catch (error) {
            this.logger.error(`Error in findAllCategories: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findCategoryTree() {
        try {
            this.logger.debug('GET /categories/tree');
            return await this.categoriesService.findCategoryTree();
        }
        catch (error) {
            this.logger.error(`Error in findCategoryTree: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAllFlat() {
        try {
            this.logger.debug('GET /categories/flat');
            return await this.categoriesService.findAllFlat();
        }
        catch (error) {
            this.logger.error(`Error in findAllFlat: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOneCategory(id) {
        return await this.categoriesService.findOneCategory(id);
    }
    async updateCategory(id, updateCategoryDto) {
        try {
            this.logger.debug(`PATCH /categories/${id}`);
            return await this.categoriesService.updateCategory(id, updateCategoryDto);
        }
        catch (error) {
            this.logger.error(`Error in updateCategory: ${error.message}`, error.stack);
            throw error;
        }
    }
    async removeCategory(id) {
        try {
            this.logger.debug(`DELETE /categories/${id}`);
            return await this.categoriesService.removeCategory(id);
        }
        catch (error) {
            this.logger.error(`Error in removeCategory: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.CategoriesController = CategoriesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_category_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('parentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "findAllCategories", null);
__decorate([
    (0, common_1.Get)('tree'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "findCategoryTree", null);
__decorate([
    (0, common_1.Get)('flat'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "findAllFlat", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "findOneCategory", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_category_dto_1.UpdateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "removeCategory", null);
exports.CategoriesController = CategoriesController = CategoriesController_1 = __decorate([
    (0, common_1.Controller)('categories'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [categories_service_1.CategoriesService])
], CategoriesController);
//# sourceMappingURL=categories.controller.js.map