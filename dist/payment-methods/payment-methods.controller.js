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
var PaymentMethodsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const payment_methods_service_1 = require("./payment-methods.service");
const create_payment_method_dto_1 = require("./dto/create-payment-method.dto");
const update_payment_method_dto_1 = require("./dto/update-payment-method.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let PaymentMethodsController = PaymentMethodsController_1 = class PaymentMethodsController {
    constructor(paymentMethodsService) {
        this.paymentMethodsService = paymentMethodsService;
        this.logger = new common_1.Logger(PaymentMethodsController_1.name);
    }
    async create(createPaymentMethodDto) {
        try {
            this.logger.debug(`POST /payment-methods - Creating: ${createPaymentMethodDto.name}`);
            return await this.paymentMethodsService.create(createPaymentMethodDto);
        }
        catch (error) {
            this.logger.error(`Error in create: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(activeOnly) {
        try {
            this.logger.debug(`GET /payment-methods${activeOnly ? '?activeOnly=true' : ''}`);
            return await this.paymentMethodsService.findAll(activeOnly === 'true');
        }
        catch (error) {
            this.logger.error(`Error in findAll: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findByType(type, activeOnly) {
        try {
            this.logger.debug(`GET /payment-methods/type/${type}${activeOnly ? '?activeOnly=true' : ''}`);
            return await this.paymentMethodsService.findByType(type, activeOnly === 'true');
        }
        catch (error) {
            this.logger.error(`Error in findByType: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        return await this.paymentMethodsService.findOne(id);
    }
    async update(id, updatePaymentMethodDto) {
        try {
            this.logger.debug(`PATCH /payment-methods/${id}`);
            return await this.paymentMethodsService.update(id, updatePaymentMethodDto);
        }
        catch (error) {
            this.logger.error(`Error in update: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            this.logger.debug(`DELETE /payment-methods/${id}`);
            return await this.paymentMethodsService.remove(id);
        }
        catch (error) {
            this.logger.error(`Error in remove: ${error.message}`, error.stack);
            throw error;
        }
    }
    async uploadQR(file) {
        if (!file) {
            throw new common_1.BadRequestException('No se proporcionó ningún archivo');
        }
        const fileUrl = `/uploads/qr/${file.filename}`;
        this.logger.debug(`QR image uploaded: ${fileUrl}`);
        return {
            url: fileUrl,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
        };
    }
};
exports.PaymentMethodsController = PaymentMethodsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payment_method_dto_1.CreatePaymentMethodDto]),
    __metadata("design:returntype", Promise)
], PaymentMethodsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentMethodsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('type/:type'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentMethodsController.prototype, "findByType", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentMethodsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_payment_method_dto_1.UpdatePaymentMethodDto]),
    __metadata("design:returntype", Promise)
], PaymentMethodsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentMethodsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('upload-qr'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/qr',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = (0, path_1.extname)(file.originalname);
                const filename = `qr-${uniqueSuffix}${ext}`;
                cb(null, filename);
            },
        }),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                return cb(new common_1.BadRequestException('Solo se permiten archivos de imagen'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentMethodsController.prototype, "uploadQR", null);
exports.PaymentMethodsController = PaymentMethodsController = PaymentMethodsController_1 = __decorate([
    (0, common_1.Controller)('payment-methods'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payment_methods_service_1.PaymentMethodsService])
], PaymentMethodsController);
//# sourceMappingURL=payment-methods.controller.js.map