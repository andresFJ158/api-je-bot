import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  async createTransaction(createDto: CreateInventoryTransactionDto) {
    try {
      // Verify product exists
      const product = await this.prisma.product.findUnique({
        where: { id: createDto.productId },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Verify agent exists if provided
      if (createDto.agentId) {
        const agent = await this.prisma.agent.findUnique({
          where: { id: createDto.agentId },
        });

        if (!agent) {
          throw new NotFoundException('Agente no encontrado');
        }
      }

      // For SALIDA, verify there's enough stock
      if (createDto.type === 'SALIDA') {
        if (product.stock < createDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente. Stock disponible: ${product.stock}, solicitado: ${createDto.quantity}`,
          );
        }
      }

      // Set glosa based on type
      let glosa = createDto.glosa;
      if (!glosa) {
        glosa = createDto.type === 'ENTRADA' ? 'Reposición stock' : null;
      }

      // Create transaction and update stock in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the transaction record
        const transaction = await tx.inventoryTransaction.create({
          data: {
            productId: createDto.productId,
            type: createDto.type,
            quantity: createDto.quantity,
            glosa: glosa,
            agentId: createDto.agentId,
          },
          include: {
            product: {
              include: {
                category: {
                  include: {
                    parent: {
                      include: {
                        parent: {
                          include: {
                            parent: {
                              include: {
                                parent: {
                                  select: {
                                    id: true,
                                    name: true,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            agent: true,
          },
        });

        // Update product stock
        const stockChange = createDto.type === 'ENTRADA' ? createDto.quantity : -createDto.quantity;
        await tx.product.update({
          where: { id: createDto.productId },
          data: {
            stock: {
              increment: stockChange,
            },
          },
        });

        return transaction;
      });

      this.logger.debug(
        `Created ${createDto.type} transaction for product ${createDto.productId}, quantity: ${createDto.quantity}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error creating transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAllTransactions(productId?: string, type?: string, agentId?: string) {
    try {
      this.logger.debug(
        `Finding transactions${productId ? ` for product: ${productId}` : ''}${type ? ` type: ${type}` : ''}`,
      );
      return await this.prisma.inventoryTransaction.findMany({
        where: {
          ...(productId && { productId }),
          ...(type && { type }),
          ...(agentId && { agentId }),
        },
        include: {
          product: {
            include: {
              category: {
                include: {
                  parent: {
                    include: {
                      parent: {
                        include: {
                          parent: {
                            include: {
                              parent: {
                                select: {
                                  id: true,
                                  name: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          agent: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error finding transactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOneTransaction(id: string) {
    const transaction = await this.prisma.inventoryTransaction.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: {
              include: {
                parent: {
                  include: {
                    parent: {
                      include: {
                        parent: {
                          include: {
                            parent: {
                              select: {
                                id: true,
                                name: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        agent: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    return transaction;
  }

  async updateTransaction(id: string, updateDto: UpdateInventoryTransactionDto) {
    try {
      const existingTransaction = await this.findOneTransaction(id);

      // If updating quantity or type, we need to reverse the old transaction and apply the new one
      if (updateDto.quantity !== undefined || updateDto.type !== undefined) {
        const product = await this.prisma.product.findUnique({
          where: { id: existingTransaction.productId },
        });

        if (!product) {
          throw new NotFoundException('Producto no encontrado');
        }

        // Calculate the difference
        const oldStockChange = existingTransaction.type === 'ENTRADA' 
          ? existingTransaction.quantity 
          : -existingTransaction.quantity;
        
        const newType = updateDto.type || existingTransaction.type;
        const newQuantity = updateDto.quantity || existingTransaction.quantity;
        const newStockChange = newType === 'ENTRADA' ? newQuantity : -newQuantity;

        // Check if new transaction would result in negative stock
        const currentStock = product.stock - oldStockChange; // Reverse old transaction
        if (newType === 'SALIDA' && currentStock < newQuantity) {
          throw new BadRequestException(
            `Stock insuficiente. Stock disponible: ${currentStock}, solicitado: ${newQuantity}`,
          );
        }

        // Update in transaction
        return await this.prisma.$transaction(async (tx) => {
          // Reverse old stock change
          await tx.product.update({
            where: { id: existingTransaction.productId },
            data: {
              stock: {
                increment: -oldStockChange,
              },
            },
          });

          // Apply new stock change
          await tx.product.update({
            where: { id: existingTransaction.productId },
            data: {
              stock: {
                increment: newStockChange,
              },
            },
          });

          // Update transaction record
          const updatedTransaction = await tx.inventoryTransaction.update({
            where: { id },
            data: {
              ...updateDto,
              glosa: updateDto.glosa !== undefined 
                ? (updateDto.glosa || (newType === 'ENTRADA' ? 'Reposición stock' : null))
                : undefined,
            },
            include: {
              product: {
                include: {
                  category: {
                    include: {
                      parent: {
                        include: {
                          parent: {
                            include: {
                              parent: {
                                include: {
                                  parent: {
                                    select: {
                                      id: true,
                                      name: true,
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              agent: true,
            },
          });

          return updatedTransaction;
        });
      } else {
        // Just update glosa or other fields without affecting stock
        return await this.prisma.inventoryTransaction.update({
          where: { id },
          data: updateDto,
          include: {
            product: {
              include: {
                category: {
                  include: {
                    parent: {
                      include: {
                        parent: {
                          include: {
                            parent: {
                              include: {
                                parent: {
                                  select: {
                                    id: true,
                                    name: true,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            agent: true,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error updating transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeTransaction(id: string) {
    try {
      const transaction = await this.findOneTransaction(id);

      // Reverse the stock change when deleting
      return await this.prisma.$transaction(async (tx) => {
        // Reverse stock change
        const stockChange = transaction.type === 'ENTRADA' 
          ? -transaction.quantity 
          : transaction.quantity;

        await tx.product.update({
          where: { id: transaction.productId },
          data: {
            stock: {
              increment: stockChange,
            },
          },
        });

        // Delete transaction
        return await tx.inventoryTransaction.delete({
          where: { id },
        });
      });
    } catch (error) {
      this.logger.error(`Error deleting transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getInventorySummary() {
    try {
      this.logger.debug('Getting inventory summary');
      const products = await this.prisma.product.findMany({
        include: {
          category: {
            include: {
              parent: {
                include: {
                  parent: {
                    include: {
                      parent: {
                        include: {
                          parent: {
                            select: {
                              id: true,
                              name: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              transactions: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const totalProducts = products.length;
      const lowStockProducts = products.filter((p) => p.stock < 10).length;
      const outOfStockProducts = products.filter((p) => p.stock === 0).length;
      const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);

      return {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue,
        products,
      };
    } catch (error) {
      this.logger.error(`Error getting inventory summary: ${error.message}`, error.stack);
      throw error;
    }
  }
}

