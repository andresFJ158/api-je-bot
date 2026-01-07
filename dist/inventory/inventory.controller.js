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
var InventoryController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const create_inventory_transaction_dto_1 = require("./dto/create-inventory-transaction.dto");
const update_inventory_transaction_dto_1 = require("./dto/update-inventory-transaction.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let InventoryController = InventoryController_1 = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
        this.logger = new common_1.Logger(InventoryController_1.name);
    }
    async createTransaction(createDto) {
        try {
            this.logger.debug(`POST /inventory/transactions - Creating ${createDto.type} transaction`);
            return await this.inventoryService.createTransaction(createDto);
        }
        catch (error) {
            this.logger.error(`Error in createTransaction: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAllTransactions(productId, type, agentId) {
        try {
            this.logger.debug(`GET /inventory/transactions${productId ? `?productId=${productId}` : ''}${type ? `&type=${type}` : ''}`);
            return await this.inventoryService.findAllTransactions(productId, type, agentId);
        }
        catch (error) {
            this.logger.error(`Error in findAllTransactions: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOneTransaction(id) {
        return await this.inventoryService.findOneTransaction(id);
    }
    async updateTransaction(id, updateDto) {
        try {
            this.logger.debug(`PATCH /inventory/transactions/${id}`);
            return await this.inventoryService.updateTransaction(id, updateDto);
        }
        catch (error) {
            this.logger.error(`Error in updateTransaction: ${error.message}`, error.stack);
            throw error;
        }
    }
    async removeTransaction(id) {
        try {
            this.logger.debug(`DELETE /inventory/transactions/${id}`);
            return await this.inventoryService.removeTransaction(id);
        }
        catch (error) {
            this.logger.error(`Error in removeTransaction: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getInventorySummary() {
        try {
            this.logger.debug('GET /inventory/summary');
            return await this.inventoryService.getInventorySummary();
        }
        catch (error) {
            this.logger.error(`Error in getInventorySummary: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)('transactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_inventory_transaction_dto_1.CreateInventoryTransactionDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)('productId')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('agentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findAllTransactions", null);
__decorate([
    (0, common_1.Get)('transactions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findOneTransaction", null);
__decorate([
    (0, common_1.Patch)('transactions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_inventory_transaction_dto_1.UpdateInventoryTransactionDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateTransaction", null);
__decorate([
    (0, common_1.Delete)('transactions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "removeTransaction", null);
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getInventorySummary", null);
exports.InventoryController = InventoryController = InventoryController_1 = __decorate([
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map