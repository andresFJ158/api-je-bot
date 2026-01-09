import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FAQService {
  private readonly logger = new Logger(FAQService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    // Note: Prisma converts model name 'FAQ' to 'fAQ' in the client
    return (this.prisma as any).fAQ.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    return (this.prisma as any).fAQ.findUnique({
      where: { id },
    });
  }

  async create(data: {
    question: string;
    answer: string;
    keywords?: string[];
    category?: string;
    order?: number;
    isActive?: boolean;
  }) {
    return (this.prisma as any).fAQ.create({
      data: {
        question: data.question,
        answer: data.answer,
        keywords: data.keywords || [],
        category: data.category,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: {
    question?: string;
    answer?: string;
    keywords?: string[];
    category?: string;
    order?: number;
    isActive?: boolean;
  }) {
    return (this.prisma as any).fAQ.update({
      where: { id },
      data: {
        ...(data.question !== undefined && { question: data.question }),
        ...(data.answer !== undefined && { answer: data.answer }),
        ...(data.keywords !== undefined && { keywords: data.keywords }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string) {
    return (this.prisma as any).fAQ.delete({
      where: { id },
    });
  }

  async reorder(ids: string[]) {
    // Actualizar el orden de múltiples FAQs
    const updates = ids.map((id, index) =>
      (this.prisma as any).fAQ.update({
        where: { id },
        data: { order: index },
      })
    );
    return Promise.all(updates);
  }
}

