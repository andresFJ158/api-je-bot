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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcrypt");
let AgentsService = class AgentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.agent.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                online: true,
                createdAt: true,
            },
        });
    }
    async findOne(id) {
        return this.prisma.agent.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                online: true,
                createdAt: true,
            },
        });
    }
    async create(createDto) {
        const hashedPassword = await bcrypt.hash(createDto.password, 10);
        return this.prisma.agent.create({
            data: {
                ...createDto,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                online: true,
                createdAt: true,
            },
        });
    }
    async updateOnlineStatus(id, online) {
        return this.prisma.agent.update({
            where: { id },
            data: { online },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                online: true,
            },
        });
    }
};
exports.AgentsService = AgentsService;
exports.AgentsService = AgentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgentsService);
//# sourceMappingURL=agents.service.js.map