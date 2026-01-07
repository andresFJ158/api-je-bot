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
var ContactsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsController = void 0;
const common_1 = require("@nestjs/common");
const contacts_service_1 = require("./contacts.service");
const create_contact_dto_1 = require("./dto/create-contact.dto");
const update_contact_dto_1 = require("./dto/update-contact.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ContactsController = ContactsController_1 = class ContactsController {
    constructor(contactsService) {
        this.contactsService = contactsService;
        this.logger = new common_1.Logger(ContactsController_1.name);
    }
    async create(createContactDto) {
        try {
            this.logger.debug(`POST /contacts - Creating contact: ${createContactDto.name}`);
            return await this.contactsService.create(createContactDto);
        }
        catch (error) {
            this.logger.error(`Error in create: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(city, search) {
        try {
            this.logger.debug(`GET /contacts${city ? `?city=${city}` : ''}${search ? `&search=${search}` : ''}`);
            return await this.contactsService.findAll(city, search);
        }
        catch (error) {
            this.logger.error(`Error in findAll: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findByPhone(phone) {
        try {
            this.logger.debug(`GET /contacts/phone/${phone}`);
            return await this.contactsService.findByPhone(phone);
        }
        catch (error) {
            this.logger.error(`Error in findByPhone: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getCities() {
        try {
            this.logger.debug('GET /contacts/cities');
            return await this.contactsService.getCities();
        }
        catch (error) {
            this.logger.error(`Error in getCities: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getStats() {
        try {
            this.logger.debug('GET /contacts/stats');
            return await this.contactsService.getStats();
        }
        catch (error) {
            this.logger.error(`Error in getStats: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        return await this.contactsService.findOne(id);
    }
    async update(id, updateContactDto) {
        try {
            this.logger.debug(`PATCH /contacts/${id}`);
            return await this.contactsService.update(id, updateContactDto);
        }
        catch (error) {
            this.logger.error(`Error in update: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            this.logger.debug(`DELETE /contacts/${id}`);
            return await this.contactsService.remove(id);
        }
        catch (error) {
            this.logger.error(`Error in remove: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.ContactsController = ContactsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_contact_dto_1.CreateContactDto]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('city')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('phone/:phone'),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "findByPhone", null);
__decorate([
    (0, common_1.Get)('cities'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "getCities", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_contact_dto_1.UpdateContactDto]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "remove", null);
exports.ContactsController = ContactsController = ContactsController_1 = __decorate([
    (0, common_1.Controller)('contacts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [contacts_service_1.ContactsService])
], ContactsController);
//# sourceMappingURL=contacts.controller.js.map