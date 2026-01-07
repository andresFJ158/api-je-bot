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
var ConversationsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const conversations_service_1 = require("./conversations.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const assign_conversation_dto_1 = require("./dto/assign-conversation.dto");
const update_mode_dto_1 = require("./dto/update-mode.dto");
let ConversationsController = ConversationsController_1 = class ConversationsController {
    constructor(conversationsService) {
        this.conversationsService = conversationsService;
        this.logger = new common_1.Logger(ConversationsController_1.name);
    }
    async findAll(tag, assignedAgentId, mode) {
        try {
            this.logger.debug(`GET /conversations - tag: ${tag}, assignedAgentId: ${assignedAgentId}, mode: ${mode}`);
            return await this.conversationsService.findAll({ tag, assignedAgentId, mode });
        }
        catch (error) {
            this.logger.error(`Error in findAll: ${error.message}`, error.stack);
            throw error;
        }
    }
    findOne(id) {
        return this.conversationsService.findOne(id);
    }
    assign(id, assignDto) {
        return this.conversationsService.assign(id, assignDto);
    }
    updateMode(id, updateModeDto) {
        return this.conversationsService.updateMode(id, updateModeDto);
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('tag')),
    __param(1, (0, common_1.Query)('assignedAgentId')),
    __param(2, (0, common_1.Query)('mode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_conversation_dto_1.AssignConversationDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)(':id/mode'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_mode_dto_1.UpdateModeDto]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "updateMode", null);
exports.ConversationsController = ConversationsController = ConversationsController_1 = __decorate([
    (0, common_1.Controller)('conversations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [conversations_service_1.ConversationsService])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map