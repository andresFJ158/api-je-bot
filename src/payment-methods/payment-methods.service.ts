import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreatePaymentMethodDto) {
    try {
      this.logger.debug(`Creating payment method: ${createDto.name} (${createDto.type})`);
      return await this.prisma.paymentMethod.create({
        data: createDto,
      });
    } catch (error) {
      this.logger.error(`Error creating payment method: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(activeOnly?: boolean) {
    try {
      this.logger.debug(`Finding payment methods${activeOnly ? ' (active only)' : ''}`);
      return await this.prisma.paymentMethod.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: [
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
      });
    } catch (error) {
      this.logger.error(`Error finding payment methods: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return paymentMethod;
  }

  async update(id: string, updateDto: UpdatePaymentMethodDto) {
    try {
      this.logger.debug(`Updating payment method: ${id}`);
      
      // Verificar que existe
      await this.findOne(id);

      return await this.prisma.paymentMethod.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      this.logger.error(`Error updating payment method: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      this.logger.debug(`Deleting payment method: ${id}`);
      
      // Verificar que existe
      await this.findOne(id);

      return await this.prisma.paymentMethod.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting payment method: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByType(type: 'QR' | 'BANK_ACCOUNT', activeOnly?: boolean) {
    try {
      this.logger.debug(`Finding payment methods by type: ${type}${activeOnly ? ' (active only)' : ''}`);
      return await this.prisma.paymentMethod.findMany({
        where: {
          type,
          ...(activeOnly ? { isActive: true } : {}),
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
      });
    } catch (error) {
      this.logger.error(`Error finding payment methods by type: ${error.message}`, error.stack);
      throw error;
    }
  }
}

