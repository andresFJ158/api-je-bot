import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

@Injectable()
export class QuickRepliesService {
  private readonly logger = new Logger(QuickRepliesService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateQuickReplyDto) {
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
    } catch (error) {
      this.logger.error(`Error creating quick reply: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(category?: string) {
    try {
      this.logger.debug(`Finding quick replies${category ? ` in category: ${category}` : ''}`);
      return await this.prisma.quickReply.findMany({
        where: category ? { category } : undefined,
        orderBy: [
          { order: 'asc' },
          { title: 'asc' },
        ],
      });
    } catch (error) {
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

      return categories.map((c) => c.category).filter((cat): cat is string => cat !== null);
    } catch (error) {
      this.logger.error(`Error getting categories: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    const quickReply = await this.prisma.quickReply.findUnique({
      where: { id },
    });

    if (!quickReply) {
      throw new NotFoundException('Respuesta rápida no encontrada');
    }

    return quickReply;
  }

  async update(id: string, updateDto: UpdateQuickReplyDto) {
    try {
      await this.findOne(id); // Verify quick reply exists
      this.logger.debug(`Updating quick reply: ${id}`);
      return await this.prisma.quickReply.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      this.logger.error(`Error updating quick reply: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id); // Verify quick reply exists
      this.logger.debug(`Deleting quick reply: ${id}`);
      return await this.prisma.quickReply.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting quick reply: ${error.message}`, error.stack);
      throw error;
    }
  }
}

