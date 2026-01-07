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
var QuickRepliesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickRepliesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let QuickRepliesService = QuickRepliesService_1 = class QuickRepliesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(QuickRepliesService_1.name);
    }
    async create(createDto) {
        try {
            this.logger.debug(`Creating quick reply: ${createDto.title}`);
            return await this.prisma.quickReply.create({
                data: {
                    title: createDto.title,
                    message: createDto.message,
                    category: createDto.category,
                    order: createDto.order || 0,
                },
            });
        }
        catch (error) {
            this.logger.error(`Error creating quick reply: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(category) {
        try {
            this.logger.debug(`Finding quick replies${category ? ` in category: ${category}` : ''}`);
            return await this.prisma.quickReply.findMany({
                where: category ? { category } : undefined,
                orderBy: [
                    { order: 'asc' },
                    { title: 'asc' },
                ],
            });
        }
        catch (error) {
            this.logger.error(`Error finding quick replies: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getCategories() {
        try {
            const categories = await this.prisma.quickReply.findMany({
                where: {
                    category: {
                        not: null,
                    },
                },
                select: {
                    category: true,
                },
                distinct: ['category'],
                orderBy: {
                    category: 'asc',
                },
            });
            return categories.map((c) => c.category).filter((cat) => cat !== null);
        }
        catch (error) {
            this.logger.error(`Error getting categories: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        const quickReply = await this.prisma.quickReply.findUnique({
            where: { id },
        });
        if (!quickReply) {
            throw new common_1.NotFoundException('Respuesta rápida no encontrada');
        }
        return quickReply;
    }
    async update(id, updateDto) {
        try {
            await this.findOne(id);
            this.logger.debug(`Updating quick reply: ${id}`);
            return await this.prisma.quickReply.update({
                where: { id },
                data: updateDto,
            });
        }
        catch (error) {
            this.logger.error(`Error updating quick reply: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            this.logger.debug(`Deleting quick reply: ${id}`);
            return await this.prisma.quickReply.delete({
                where: { id },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting quick reply: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.QuickRepliesService = QuickRepliesService;
exports.QuickRepliesService = QuickRepliesService = QuickRepliesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuickRepliesService);
//# sourceMappingURL=quick-replies.service.js.map