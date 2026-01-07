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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("./whatsapp.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let WhatsAppController = class WhatsAppController {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    async getStatus() {
        return await this.whatsappService.getConnectionStatus();
    }
    async getQR() {
        return await this.whatsappService.getQRCode();
    }
    async reconnect() {
        return await this.whatsappService.reconnect();
    }
    async disconnect() {
        return await this.whatsappService.disconnect();
    }
    async syncMessages(conversationId) {
        return await this.whatsappService.syncMessagesFromWhatsApp(conversationId);
    }
};
exports.WhatsAppController = WhatsAppController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('qr'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "getQR", null);
__decorate([
    (0, common_1.Post)('reconnect'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "reconnect", null);
__decorate([
    (0, common_1.Post)('disconnect'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Post)('sync-messages/:conversationId'),
    __param(0, (0, common_1.Param)('conversationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsAppController.prototype, "syncMessages", null);
exports.WhatsAppController = WhatsAppController = __decorate([
    (0, common_1.Controller)('whatsapp'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsAppService])
], WhatsAppController);
//# sourceMappingURL=whatsapp.controller.js.map