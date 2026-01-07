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
var BotController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotController = void 0;
const common_1 = require("@nestjs/common");
const bot_service_1 = require("./bot.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const update_bot_config_dto_1 = require("./dto/update-bot-config.dto");
let BotController = BotController_1 = class BotController {
    constructor(botService) {
        this.botService = botService;
        this.logger = new common_1.Logger(BotController_1.name);
    }
    async getConfig() {
        try {
            this.logger.debug('GET /bot-config');
            return await this.botService.getBotConfig();
        }
        catch (error) {
            this.logger.error(`Error in getConfig: ${error.message}`, error.stack);
            throw error;
        }
    }
    updateConfig(updateDto) {
        return this.botService.updateBotConfig(updateDto);
    }
};
exports.BotController = BotController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BotController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_bot_config_dto_1.UpdateBotConfigDto]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "updateConfig", null);
exports.BotController = BotController = BotController_1 = __decorate([
    (0, common_1.Controller)('bot-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [bot_service_1.BotService])
], BotController);
//# sourceMappingURL=bot.controller.js.map