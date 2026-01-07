import { Injectable, NotFoundException, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { normalizePhoneNumber } from '../common/utils';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ConversationsService))
    private conversationsService: ConversationsService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
  ) { }

  async create(createDto: CreateContactDto) {
    try {
      // Normalizar el número de teléfono antes de guardarlo
      const normalizedPhone = normalizePhoneNumber(createDto.phone);

      if (!normalizedPhone || normalizedPhone.length < 8) {
        throw new BadRequestException('El número de teléfono no es válido');
      }

      // Check if contact with this phone already exists
      const existingContact = await this.prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingContact) {
        throw new BadRequestException('Ya existe un contacto con este número de teléfono');
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

      // Si se proporciona un mensaje inicial, crear conversación y enviar mensaje
      if (createDto.initialMessage) {
        try {
          // Crear o obtener conversación
          const conversation = await this.conversationsService.create({
            phone: normalizedPhone,
            name: `${createDto.name} ${createDto.lastName || ''}`.trim(),
          });

          // Enviar mensaje inicial como agente
          await this.messagesService.create({
            conversationId: conversation.id,
            sender: 'agent',
            content: createDto.initialMessage,
          });

          this.logger.debug(`Sent initial message to contact: ${normalizedPhone}`);
        } catch (error) {
          this.logger.warn(`Error sending initial message: ${error.message}`, error.stack);
          // No fallar la creación del contacto si hay error al enviar mensaje
        }
      }

      return contact;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe un contacto con este número de teléfono');
      }
      this.logger.error(`Error creating contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(city?: string, search?: string) {
    try {
      this.logger.debug(`Finding contacts${city ? ` in city: ${city}` : ''}${search ? ` with search: ${search}` : ''}`);

      const where: any = {};

      if (city) {
        where.city = city;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
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
    } catch (error) {
      this.logger.error(`Error finding contacts: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
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
      throw new NotFoundException('Contacto no encontrado');
    }

    return contact;
  }

  async findByPhone(phone: string) {
    // Normalizar el número antes de buscar
    const normalizedPhone = normalizePhoneNumber(phone);
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

  async update(id: string, updateDto: UpdateContactDto) {
    try {
      await this.findOne(id); // Verify contact exists

      // If updating phone, normalize it and check if it's already taken
      if (updateDto.phone) {
        const normalizedPhone = normalizePhoneNumber(updateDto.phone);

        if (!normalizedPhone || normalizedPhone.length < 8) {
          throw new BadRequestException('El número de teléfono no es válido');
        }

        const existingContact = await this.prisma.user.findUnique({
          where: { phone: normalizedPhone },
        });

        if (existingContact && existingContact.id !== id) {
          throw new BadRequestException('Ya existe un contacto con este número de teléfono');
        }

        // Actualizar el DTO con el número normalizado
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
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe un contacto con este número de teléfono');
      }
      this.logger.error(`Error updating contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id); // Verify contact exists
      this.logger.debug(`Deleting contact: ${id}`);
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
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

      return cities.map((c) => c.city).filter((city): city is string => city !== null);
    } catch (error) {
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
    } catch (error) {
      this.logger.error(`Error getting stats: ${error.message}`, error.stack);
      throw error;
    }
  }
}

