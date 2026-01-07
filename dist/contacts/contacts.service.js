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
var ContactsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const conversations_service_1 = require("../conversations/conversations.service");
const messages_service_1 = require("../messages/messages.service");
const utils_1 = require("../common/utils");
let ContactsService = ContactsService_1 = class ContactsService {
    constructor(prisma, conversationsService, messagesService) {
        this.prisma = prisma;
        this.conversationsService = conversationsService;
        this.messagesService = messagesService;
        this.logger = new common_1.Logger(ContactsService_1.name);
    }
    async create(createDto) {
        try {
            const normalizedPhone = (0, utils_1.normalizePhoneNumber)(createDto.phone);
            if (!normalizedPhone || normalizedPhone.length < 8) {
                throw new common_1.BadRequestException('El número de teléfono no es válido');
            }
            const existingContact = await this.prisma.user.findUnique({
                where: { phone: normalizedPhone },
            });
            if (existingContact) {
                throw new common_1.BadRequestException('Ya existe un contacto con este número de teléfono');
            }
            this.logger.debug(`Creating contact: ${createDto.name} ${createDto.lastName || ''}`);
            const contact = await this.prisma.user.create({
                data: {
                    phone: normalizedPhone,
                    name: createDto.name,
                    lastName: createDto.lastName,
                    email: createDto.email,
                    city: createDto.city,
                },
                include: {
                    _count: {
                        select: {
                            conversations: true,
                        },
                    },
                },
            });
            if (createDto.initialMessage) {
                try {
                    const conversation = await this.conversationsService.create({
                        phone: normalizedPhone,
                        name: `${createDto.name} ${createDto.lastName || ''}`.trim(),
                    });
                    await this.messagesService.create({
                        conversationId: conversation.id,
                        sender: 'agent',
                        content: createDto.initialMessage,
                    });
                    this.logger.debug(`Sent initial message to contact: ${normalizedPhone}`);
                }
                catch (error) {
                    this.logger.warn(`Error sending initial message: ${error.message}`, error.stack);
                }
            }
            return contact;
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.BadRequestException('Ya existe un contacto con este número de teléfono');
            }
            this.logger.error(`Error creating contact: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(city, search) {
        try {
            this.logger.debug(`Finding contacts${city ? ` in city: ${city}` : ''}${search ? ` with search: ${search}` : ''}`);
            const where = {};
            if (city) {
                where.city = city;
            }
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                    { lastName: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                    { phone: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                    { email: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                ];
            }
            return await this.prisma.user.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            conversations: true,
                        },
                    },
                },
                orderBy: [
                    { name: 'asc' },
                    { lastName: 'asc' },
                ],
            });
        }
        catch (error) {
            this.logger.error(`Error finding contacts: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findOne(id) {
        const contact = await this.prisma.user.findUnique({
            where: { id },
            include: {
                conversations: {
                    orderBy: { updatedAt: 'desc' },
                    take: 5,
                },
                _count: {
                    select: {
                        conversations: true,
                    },
                },
            },
        });
        if (!contact) {
            throw new common_1.NotFoundException('Contacto no encontrado');
        }
        return contact;
    }
    async findByPhone(phone) {
        const normalizedPhone = (0, utils_1.normalizePhoneNumber)(phone);
        const contact = await this.prisma.user.findUnique({
            where: { phone: normalizedPhone },
            include: {
                _count: {
                    select: {
                        conversations: true,
                    },
                },
            },
        });
        return contact;
    }
    async update(id, updateDto) {
        try {
            await this.findOne(id);
            if (updateDto.phone) {
                const normalizedPhone = (0, utils_1.normalizePhoneNumber)(updateDto.phone);
                if (!normalizedPhone || normalizedPhone.length < 8) {
                    throw new common_1.BadRequestException('El número de teléfono no es válido');
                }
                const existingContact = await this.prisma.user.findUnique({
                    where: { phone: normalizedPhone },
                });
                if (existingContact && existingContact.id !== id) {
                    throw new common_1.BadRequestException('Ya existe un contacto con este número de teléfono');
                }
                updateDto.phone = normalizedPhone;
            }
            this.logger.debug(`Updating contact: ${id}`);
            return await this.prisma.user.update({
                where: { id },
                data: updateDto,
                include: {
                    _count: {
                        select: {
                            conversations: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.BadRequestException('Ya existe un contacto con este número de teléfono');
            }
            this.logger.error(`Error updating contact: ${error.message}`, error.stack);
            throw error;
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            this.logger.debug(`Deleting contact: ${id}`);
            return await this.prisma.user.delete({
                where: { id },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting contact: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getCities() {
        try {
            const cities = await this.prisma.user.findMany({
                where: {
                    city: {
                        not: null,
                    },
                },
                select: {
                    city: true,
                },
                distinct: ['city'],
                orderBy: {
                    city: 'asc',
                },
            });
            return cities.map((c) => c.city).filter((city) => city !== null);
        }
        catch (error) {
            this.logger.error(`Error getting cities: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getStats() {
        try {
            const totalContacts = await this.prisma.user.count();
            const contactsWithCity = await this.prisma.user.count({
                where: {
                    city: {
                        not: null,
                    },
                },
            });
            const contactsWithEmail = await this.prisma.user.count({
                where: {
                    email: {
                        not: null,
                    },
                },
            });
            const contactsWithConversations = await this.prisma.user.count({
                where: {
                    conversations: {
                        some: {},
                    },
                },
            });
            return {
                totalContacts,
                contactsWithCity,
                contactsWithEmail,
                contactsWithConversations,
            };
        }
        catch (error) {
            this.logger.error(`Error getting stats: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.ContactsService = ContactsService;
exports.ContactsService = ContactsService = ContactsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => conversations_service_1.ConversationsService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => messages_service_1.MessagesService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        conversations_service_1.ConversationsService,
        messages_service_1.MessagesService])
], ContactsService);
//# sourceMappingURL=contacts.service.js.map