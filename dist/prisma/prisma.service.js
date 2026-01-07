"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super(...arguments);
        this.logger = new common_1.Logger(PrismaService_1.name);
    }
    async onModuleInit() {
        if (process.env.NODE_ENV === 'production') {
            try {
                this.logger.log('🔄 Running database migrations...');
                const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
                    env: { ...process.env },
                    maxBuffer: 10 * 1024 * 1024,
                });
                if (stdout) {
                    this.logger.log(stdout);
                }
                if (stderr && !stderr.includes('No pending migrations')) {
                    this.logger.warn(stderr);
                }
                this.logger.log('✅ Database migrations completed');
            }
            catch (error) {
                this.logger.error('❌ Failed to run migrations:', error.message);
                if (error.stdout) {
                    this.logger.error('Migration stdout:', error.stdout);
                }
                if (error.stderr) {
                    this.logger.error('Migration stderr:', error.stderr);
                }
            }
        }
        await this.$connect();
        this.logger.log('✅ Database connected');
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map