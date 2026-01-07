import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { BotService } from '../bot/bot.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private websocketGateway: WebSocketGateway,
    private botService: BotService,
    @Inject(forwardRef(() => WhatsAppService))
    private whatsappService: WhatsAppService,
  ) { }

  async create(createDto: CreateMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: createDto.conversationId },
      include: { user: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: createDto.conversationId,
        sender: createDto.sender,
        content: createDto.content,
        agentId: createDto.sender === 'agent' ? createDto.agentId : null,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update conversation
    const updatedConversation = await this.prisma.conversation.update({
      where: { id: createDto.conversationId },
      data: {
        lastMessage: createDto.content,
        updatedAt: new Date(),
        // If agent sends message, switch to HUMAN mode
        ...(createDto.sender === 'agent' && { mode: 'HUMAN' }),
      },
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
      },
    });

    // Broadcast conversation update
    this.websocketGateway.broadcastConversationUpdate(updatedConversation);

    // Broadcast to frontend with full conversation data
    this.websocketGateway.broadcastNewMessage({
      ...message,
      conversation: {
        id: updatedConversation.id,
        userId: updatedConversation.userId,
        assignedAgentId: updatedConversation.assignedAgentId,
        tag: updatedConversation.tag,
        mode: updatedConversation.mode,
        lastMessage: updatedConversation.lastMessage,
        createdAt: updatedConversation.createdAt,
        updatedAt: updatedConversation.updatedAt,
        user: {
          id: updatedConversation.user.id,
          phone: updatedConversation.user.phone,
          name: updatedConversation.user.name,
          lastName: updatedConversation.user.lastName,
          email: updatedConversation.user.email,
          city: updatedConversation.user.city,
        },
      },
    });

    // If mode is BOT and sender is user, get bot response
    // Only if the message didn't come from WhatsApp (to avoid duplicate responses)
    if (conversation.mode === 'BOT' && createDto.sender === 'user') {
      // Show typing indicator
      await this.whatsappService.sendTypingIndicator(conversation.user.phone, true);

      try {
        const botResponse = await this.botService.generateResponse(
          createDto.conversationId,
          createDto.content,
        );

        if (botResponse) {
          // Create bot message (this will broadcast via WebSocket)
          const botMessage = await this.create({
            conversationId: createDto.conversationId,
            sender: 'bot',
            content: botResponse,
          });

          // Send via WhatsApp with typing indicator
          // Check if this is being called from WhatsAppService (which already sends it)
          await this.whatsappService.sendMessage(
            conversation.user.phone,
            botResponse,
            true, // Show typing indicator
          );
        } else {
          // Stop typing indicator if no response
          await this.whatsappService.sendTypingIndicator(conversation.user.phone, false);
        }
      } catch (error) {
        // Stop typing indicator on error
        await this.whatsappService.sendTypingIndicator(conversation.user.phone, false);
        throw error;
      }
    } else if (createDto.sender === 'agent') {
      // Send agent message via WhatsApp
      // Use the saved JID if available, otherwise use the phone number
      const phoneOrJid = conversation.user.whatsappJid || conversation.user.phone;
      try {
        const sent = await this.whatsappService.sendMessage(
          phoneOrJid,
          createDto.content,
        );
        if (!sent) {
          // Log warning but don't fail - message is already in database
          console.warn(`Failed to send message to WhatsApp for conversation ${createDto.conversationId}, but message saved in database`);
        }
      } catch (error) {
        // Log error but don't fail - message is already in database
        console.error(`Error sending message to WhatsApp: ${error.message}`, error);
      }
    } else if (createDto.sender === 'bot') {
      // Bot messages created from MessagesService (not from WhatsApp) should be sent
      // But if called from WhatsAppService, it will send it there
      // For now, we'll let WhatsAppService handle sending bot messages from WhatsApp
      // and MessagesService handle sending bot messages from the API
      if (!(createDto as any).skipWhatsApp) {
        await this.whatsappService.sendMessage(
          conversation.user.phone,
          createDto.content,
        );
      }
    }

    return message;
  }

  async findByConversation(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

