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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async validateAgent(email, password) {
        const agent = await this.prisma.agent.findUnique({
            where: { email },
        });
        if (!agent) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isHashed = agent.password.startsWith('$2a$') ||
            agent.password.startsWith('$2b$') ||
            agent.password.startsWith('$2y$');
        if (!isHashed) {
            throw new common_1.UnauthorizedException('Invalid credentials - password not properly hashed');
        }
        const isPasswordValid = await bcrypt.compare(password, agent.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const { password: _, ...result } = agent;
        return result;
    }
    async login(loginDto) {
        const agent = await this.validateAgent(loginDto.email, loginDto.password);
        const payload = { email: agent.email, sub: agent.id, role: agent.role };
        return {
            access_token: this.jwtService.sign(payload),
            agent: {
                id: agent.id,
                name: agent.name,
                email: agent.email,
                role: agent.role,
            },
        };
    }
    async validateToken(payload) {
        const agent = await this.prisma.agent.findUnique({
            where: { id: payload.sub },
        });
        if (!agent) {
            throw new common_1.UnauthorizedException();
        }
        return agent;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map