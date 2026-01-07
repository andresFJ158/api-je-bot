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
var QuickRepliesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickRepliesController = void 0;
const common_1 = require("@nestjs/common");
const quick_replies_service_1 = require("./quick-replies.service");
const create_quick_reply_dto_1 = require("./dto/create-quick-reply.dto");
const update_quick_reply_dto_1 = require("./dto/update-quick-reply.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let QuickRepliesController = QuickRepliesController_1 = class QuickRepliesController {
    constructor(quickRepliesService) {
        this.quickRepliesService = quickRepliesService;
        this.logger = new common_1.Logger(QuickRepliesController_1.name);
    }
    async create(createQuickReplyDto) {
        try {
            this.logger.debug(`POST /quick-replies - Creating quick reply: ${createQuickReplyDto.title}`);
            return await this.quickRepliesService.create(createQuickReplyDto);
        }
        catch (error) {
            this.logger.error(`Error in create: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(category) {
        try {
            this.logger.debug(`GET /quick-replies${category ? `?category=${category}` : ''}`);
            return await this.quickRepliesService.findAll(category);
        }
        catch (error) {
            this.logger.error(`Error in findAll: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getCategories() {
        try {
            this.logger.debug('GET /quick-replies/categories');
            return await this.quickRepliesService.getCategories();
        }
        catch (error) {
            this.logger.error(`Error in getCategories: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        return await this.quickRepliesService.findOne(id);
    }
    async update(id, updateQuickReplyDto) {
        try {
            this.logger.debug(`PATCH /quick-replies/${id}`);
            return await this.quickRepliesService.update(id, updateQuickReplyDto);
        }
        catch (error) {
            this.logger.error(`Error in update: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            this.logger.debug(`DELETE /quick-replies/${id}`);
            return await this.quickRepliesService.remove(id);
        }
        catch (error) {
            this.logger.error(`Error in remove: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.QuickRepliesController = QuickRepliesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_quick_reply_dto_1.CreateQuickReplyDto]),
    __metadata("design:returntype", Promise)
], QuickRepliesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuickRepliesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QuickRepliesController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuickRepliesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_quick_reply_dto_1.UpdateQuickReplyDto]),
    __metadata("design:returntype", Promise)
], QuickRepliesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuickRepliesController.prototype, "remove", null);
exports.QuickRepliesController = QuickRepliesController = QuickRepliesController_1 = __decorate([
    (0, common_1.Controller)('quick-replies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [quick_replies_service_1.QuickRepliesService])
], QuickRepliesController);
//# sourceMappingURL=quick-replies.controller.js.map