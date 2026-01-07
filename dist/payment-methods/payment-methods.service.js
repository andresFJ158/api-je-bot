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
var PaymentMethodsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PaymentMethodsService = PaymentMethodsService_1 = class PaymentMethodsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PaymentMethodsService_1.name);
    }
    async create(createDto) {
        try {
            this.logger.debug(`Creating payment method: ${createDto.name} (${createDto.type})`);
            return await this.prisma.paymentMethod.create({
                data: createDto,
            });
        }
        catch (error) {
            this.logger.error(`Error creating payment method: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(activeOnly) {
        try {
            this.logger.debug(`Finding payment methods${activeOnly ? ' (active only)' : ''}`);
            return await this.prisma.paymentMethod.findMany({
                where: activeOnly ? { isActive: true } : undefined,
                orderBy: [
                    { order: 'asc' },
                    { createdAt: 'desc' },
                ],
            });
        }
        catch (error) {
            this.logger.error(`Error finding payment methods: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        const paymentMethod = await this.prisma.paymentMethod.findUnique({
            where: { id },
        });
        if (!paymentMethod) {
            throw new common_1.NotFoundException('Payment method not found');
        }
        return paymentMethod;
    }
    async update(id, updateDto) {
        try {
            this.logger.debug(`Updating payment method: ${id}`);
            await this.findOne(id);
            return await this.prisma.paymentMethod.update({
                where: { id },
                data: updateDto,
            });
        }
        catch (error) {
            this.logger.error(`Error updating payment method: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            this.logger.debug(`Deleting payment method: ${id}`);
            await this.findOne(id);
            return await this.prisma.paymentMethod.delete({
                where: { id },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting payment method: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findByType(type, activeOnly) {
        try {
            this.logger.debug(`Finding payment methods by type: ${type}${activeOnly ? ' (active only)' : ''}`);
            return await this.prisma.paymentMethod.findMany({
                where: {
                    type,
                    ...(activeOnly ? { isActive: true } : {}),
                },
                orderBy: [
                    { order: 'asc' },
                    { createdAt: 'desc' },
                ],
            });
        }
        catch (error) {
            this.logger.error(`Error finding payment methods by type: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.PaymentMethodsService = PaymentMethodsService;
exports.PaymentMethodsService = PaymentMethodsService = PaymentMethodsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentMethodsService);
//# sourceMappingURL=payment-methods.service.js.map