import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { UpdateModeDto } from './dto/update-mode.dto';
import { normalizePhoneNumber } from '../common/utils';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private prisma: PrismaService,
    private websocketGateway: WebSocketGateway,
  ) { }

  async findAll(filters?: { tag?: string; assignedAgentId?: string; mode?: string }) {
    try {
      this.logger.debug(`Finding conversations with filters: ${JSON.stringify(filters)}`);

      const whereClause: any = {};
      if (filters?.tag) whereClause.tag = filters.tag;
      if (filters?.assignedAgentId) whereClause.assignedAgentId = filters.assignedAgentId;
      if (filters?.mode) whereClause.mode = filters.mode;

      this.logger.debug(`Where clause: ${JSON.stringify(whereClause)}`);

      // First, try to get conversations without relations to check if query works
      this.logger.debug('Attempting to fetch conversations from database...');

      // First check if there are any conversations at all
      const totalCount = await this.prisma.conversation.count();
      this.logger.debug(`Total conversations in database: ${totalCount}`);

      const conversations = await this.prisma.conversation.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              name: true,
              email: true,
              tags: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          assignedAgent: {
            select: {
              id: true,
              name: true,
              email: true,
              online: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      this.logger.debug(`Found ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      this.logger.error(`Error finding conversations: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      this.logger.error(`Error name: ${error.name}`);
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        user: true,
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            online: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async create(createDto: CreateConversationDto) {
    // Normalizar el número de teléfono antes de buscar o crear
    const normalizedPhone = normalizePhoneNumber(createDto.phone);
    
    if (!normalizedPhone || normalizedPhone.length < 8) {
      throw new NotFoundException('El número de teléfono no es válido');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalizedPhone,
          name: createDto.name || normalizedPhone,
        },
      });
    }

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          userId: user.id,
          mode: 'BOT',
        },
      });
      
      // Broadcast new conversation
      const fullConversation = await this.findOne(conversation.id);
      this.websocketGateway.broadcastConversationUpdate(fullConversation);
      return fullConversation;
    }

    return this.findOne(conversation.id);
  }

  async assign(id: string, assignDto: AssignConversationDto) {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        assignedAgentId: assignDto.agentId,
        tag: assignDto.tag,
      },
      include: {
        user: true,
        assignedAgent: true,
      },
    });

    this.websocketGateway.broadcastConversationUpdate(conversation);
    return conversation;
  }

  async updateMode(id: string, updateModeDto: UpdateModeDto) {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { mode: updateModeDto.mode },
      include: {
        user: true,
        assignedAgent: true,
      },
    });

    this.websocketGateway.broadcastConversationUpdate(conversation);
    return conversation;
  }
}

