import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { TransactionType } from '../inventory/dto/create-inventory-transaction.dto';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { normalizePhoneNumber } from '../common/utils';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    @Inject(forwardRef(() => WebSocketGateway))
    private websocketGateway: WebSocketGateway,
    @Inject(forwardRef(() => WhatsAppService))
    private whatsappService: WhatsAppService,
  ) {}

  async create(createDto: CreateOrderDto, agentId?: string) {
    try {
      this.logger.debug(`Creating order for branch: ${createDto.branchId}`);

      // Verificar que la sucursal existe y está activa
      const branch = await this.prisma.branch.findUnique({
        where: { id: createDto.branchId },
      });

      if (!branch) {
        throw new NotFoundException('Sucursal no encontrada');
      }

      if (!branch.isActive) {
        throw new BadRequestException('La sucursal no está activa');
      }

      // Verificar que el cliente existe si se proporciona
      if (createDto.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: createDto.userId },
        });

        if (!user) {
          throw new NotFoundException('Cliente no encontrado');
        }
      }

      // Validar y calcular items
      const orderItems = [];
      let subtotal = 0;

      for (const itemDto of createDto.items) {
        const product = await this.prisma.product.findUnique({
          where: { id: itemDto.productId },
        });

        if (!product) {
          throw new NotFoundException(`Producto no encontrado: ${itemDto.productId}`);
        }

        // Verificar stock disponible
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${product.name}. Stock disponible: ${product.stock}, solicitado: ${itemDto.quantity}`,
          );
        }

        const unitPrice = itemDto.unitPrice ?? product.price;
        const itemDiscount = itemDto.discount ?? 0;
        const itemSubtotal = itemDto.quantity * unitPrice - itemDiscount;

        orderItems.push({
          productId: itemDto.productId,
          quantity: itemDto.quantity,
          unitPrice,
          discount: itemDiscount,
          subtotal: itemSubtotal,
        });

        subtotal += itemSubtotal;
      }

      if (orderItems.length === 0) {
        throw new BadRequestException('El pedido debe tener al menos un item');
      }

      const discount = createDto.discount ?? 0;
      const tax = createDto.tax ?? 0;
      const total = subtotal - discount + tax;

      // Crear el pedido con sus items
      const order = await this.prisma.order.create({
        data: {
          branchId: createDto.branchId,
          userId: createDto.userId,
          agentId,
          subtotal,
          discount,
          tax,
          total,
          notes: createDto.notes,
          items: {
            create: orderItems,
          },
        },
        include: {
          branch: true,
          user: true,
          agent: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      // Registrar salida de inventario para cada producto
      for (const item of orderItems) {
        await this.inventoryService.createTransaction({
          productId: item.productId,
          type: TransactionType.SALIDA,
          quantity: item.quantity,
          glosa: 'venta pos',
          agentId,
        });
      }

      // Broadcast new order via WebSocket
      this.websocketGateway.broadcastNewOrder(order);

      this.logger.log(`Order created successfully: ${order.id}`);
      return order;
    } catch (error) {
      this.logger.error(`Error creating order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(filters?: {
    branchId?: string;
    userId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      this.logger.debug('Finding all orders');

      const where: any = {};

      if (filters?.branchId) {
        where.branchId = filters.branchId;
      }

      if (filters?.userId) {
        where.userId = filters.userId;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      return await this.prisma.order.findMany({
        where,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              phone: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.logger.error(`Error finding orders: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        branch: true,
        user: true,
        agent: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return order;
  }

  async update(id: string, updateDto: UpdateOrderDto) {
    try {
      const order = await this.findOne(id);

      // Si se cambia el estado a COMPLETADO, no se puede modificar
      if (order.status === 'COMPLETADO') {
        throw new BadRequestException('No se puede modificar un pedido completado');
      }

      // Si se cambia el estado a CANCELADO, no se puede modificar
      if (order.status === 'CANCELADO') {
        throw new BadRequestException('No se puede modificar un pedido cancelado');
      }

      // Si se actualiza el descuento o impuestos, recalcular el total
      let subtotal = order.subtotal;
      let discount = updateDto.discount ?? order.discount;
      let tax = updateDto.tax ?? order.tax;
      let total = subtotal - discount + tax;

      this.logger.debug(`Updating order: ${id}`);
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status: updateDto.status,
          discount,
          tax,
          total,
          notes: updateDto.notes,
        },
        include: {
          branch: true,
          user: true,
          agent: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      // Broadcast order update via WebSocket
      this.websocketGateway.broadcastNewOrder(updatedOrder);

      // Enviar notificación por WhatsApp si cambió el estado y hay un usuario asociado
      if (updateDto.status && updateDto.status !== order.status && updatedOrder.user?.phone) {
        // Check if notifications are enabled
        const botConfig = await this.prisma.botConfig.findFirst();
        if (botConfig?.notifyOrderStatusChanges) {
          await this.sendStatusNotification(updatedOrder);
        }
      }

      return updatedOrder;
    } catch (error) {
      this.logger.error(`Error updating order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancel(id: string, agentId?: string) {
    try {
      const order = await this.findOne(id);

      // No se pueden cancelar pedidos completados
      if (order.status === 'COMPLETADO') {
        throw new BadRequestException('No se puede cancelar un pedido completado');
      }

      // No se pueden cancelar pedidos ya cancelados
      if (order.status === 'CANCELADO') {
        throw new BadRequestException('El pedido ya está cancelado');
      }

      this.logger.debug(`Cancelling order: ${id}`);

      // Revertir transacciones de inventario (crear ENTRADAS para cada item)
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          await this.inventoryService.createTransaction({
            productId: item.productId,
            type: TransactionType.ENTRADA,
            quantity: item.quantity,
            glosa: `Cancelación de pedido ${order.id.substring(0, 8)}`,
            agentId: agentId,
          });
        }
        this.logger.debug(`Reverted inventory for ${order.items.length} items`);
      }

      // Actualizar estado a CANCELADO
      const cancelledOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELADO',
        },
        include: {
          branch: true,
          user: true,
          agent: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      // Broadcast order update via WebSocket
      this.websocketGateway.broadcastNewOrder(cancelledOrder);

      // Enviar notificación por WhatsApp si hay un usuario asociado
      if (cancelledOrder.user?.phone) {
        // Check if notifications are enabled
        const botConfig = await this.prisma.botConfig.findFirst();
        if (botConfig?.notifyOrderStatusChanges) {
          await this.sendStatusNotification(cancelledOrder);
        }
      }

      this.logger.log(`Order cancelled successfully: ${id}`);
      return cancelledOrder;
    } catch (error) {
      this.logger.error(`Error cancelling order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const order = await this.findOne(id);

      // Solo se pueden eliminar pedidos pendientes de pago o cancelados
      if (order.status !== 'PENDIENTE_DE_PAGO' && order.status !== 'CANCELADO') {
        throw new BadRequestException('Solo se pueden eliminar pedidos pendientes de pago o cancelados');
      }

      this.logger.debug(`Deleting order: ${id}`);
      return await this.prisma.order.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStats(branchId?: string, startDate?: Date, endDate?: Date) {
    try {
      const where: any = {};

      if (branchId) {
        where.branchId = branchId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      const [totalOrders, totalRevenue, completedOrders, pendingOrders] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.aggregate({
          where: { ...where, status: 'COMPLETADO' },
          _sum: { total: true },
        }),
        this.prisma.order.count({ where: { ...where, status: 'COMPLETADO' } }),
        this.prisma.order.count({ where: { ...where, status: 'PENDIENTE_DE_PAGO' } }),
      ]);

      return {
        totalOrders,
        totalRevenue: totalRevenue._sum.total ?? 0,
        completedOrders,
        pendingOrders,
        averageOrderValue: completedOrders > 0 ? (totalRevenue._sum.total ?? 0) / completedOrders : 0,
      };
    } catch (error) {
      this.logger.error(`Error getting stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Envía una notificación por WhatsApp al usuario cuando cambia el estado de su pedido
   */
  private async sendStatusNotification(order: any): Promise<void> {
    try {
      if (!order.user?.phone) {
        this.logger.debug(`No phone number available for order ${order.id}`);
        return;
      }

      // Normalizar número de teléfono
      const phone = normalizePhoneNumber(order.user.phone);

      if (!phone || phone.length < 8) {
        this.logger.warn(`Invalid phone number for order ${order.id}: ${order.user.phone}`);
        return;
      }

      // Obtener mensaje según el estado
      const statusMessages: Record<string, string> = {
        PENDIENTE_DE_PAGO: `🛒 *Pedido Pendiente de Pago*\n\nTu pedido #${order.id.substring(0, 8)} está pendiente de pago.\n\nTotal: Bs. ${order.total.toFixed(2)}\n\nPor favor, realiza el pago para procesar tu pedido.`,
        PAGO_RECIBIDO: `✅ *Pago Recibido*\n\nHemos recibido el pago de tu pedido #${order.id.substring(0, 8)}.\n\nTotal pagado: Bs. ${order.total.toFixed(2)}\n\nTu pedido está siendo procesado.`,
        COMPLETADO: `🎉 *Pedido Completado*\n\nTu pedido #${order.id.substring(0, 8)} ha sido completado exitosamente.\n\nTotal: Bs. ${order.total.toFixed(2)}\n\n¡Gracias por tu compra!`,
        CANCELADO: `❌ *Pedido Cancelado*\n\nTu pedido #${order.id.substring(0, 8)} ha sido cancelado.\n\nSi realizaste un pago, será reembolsado según nuestras políticas.`,
      };

      const message = statusMessages[order.status];
      if (!message) {
        this.logger.debug(`No notification message defined for status: ${order.status}`);
        return;
      }

      // Enviar mensaje por WhatsApp
      const sent = await this.whatsappService.sendMessage(phone, message);
      if (sent) {
        this.logger.log(`Status notification sent to ${phone} for order ${order.id}`);
      } else {
        this.logger.warn(`Failed to send status notification to ${phone} for order ${order.id}`);
      }
    } catch (error) {
      // No lanzar error para no interrumpir el flujo principal
      this.logger.error(`Error sending status notification for order ${order.id}: ${error.message}`, error.stack);
    }
  }
}

