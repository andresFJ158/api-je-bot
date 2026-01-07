import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

@Injectable()
export class CombosService {
  private readonly logger = new Logger(CombosService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateComboDto) {
    try {
      this.logger.debug(`Creating combo: ${createDto.name}`);

      // Verificar que la categoría existe si se proporciona
      if (createDto.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: createDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException('Categoría no encontrada');
        }
      }

      // Verificar que todos los productos existen
      if (!createDto.items || createDto.items.length === 0) {
        throw new BadRequestException('Un combo debe tener al menos un producto');
      }

      const productIds = createDto.items.map(item => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Uno o más productos no existen');
      }

      // Crear el combo con sus items
      return await this.prisma.combo.create({
        data: {
          name: createDto.name,
          description: createDto.description,
          offerPrice: createDto.offerPrice,
          categoryId: createDto.categoryId || undefined,
          isActive: createDto.isActive ?? true,
          items: {
            create: createDto.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
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
    } catch (error) {
      this.logger.error(`Error creating combo: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(categoryId?: string, includeInactive?: boolean) {
    try {
      this.logger.debug(`Finding combos${categoryId ? ` with categoryId: ${categoryId}` : ''}`);
      return await this.prisma.combo.findMany({
        where: {
          ...(categoryId && { categoryId }),
          ...(includeInactive !== true && { isActive: true }),
        },
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
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error finding combos: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    const combo = await this.prisma.combo.findUnique({
      where: { id },
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

    if (!combo) {
      throw new NotFoundException('Combo no encontrado');
    }

    return combo;
  }

  async update(id: string, updateDto: UpdateComboDto) {
    try {
      await this.findOne(id); // Verificar que el combo existe

      // Verificar categoría si se proporciona
      if (updateDto.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: updateDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException('Categoría no encontrada');
        }
      }

      // Si se actualizan los items, verificar que los productos existen
      if (updateDto.items) {
        if (updateDto.items.length === 0) {
          throw new BadRequestException('Un combo debe tener al menos un producto');
        }

        const productIds = updateDto.items.map(item => item.productId);
        const products = await this.prisma.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          throw new BadRequestException('Uno o más productos no existen');
        }
      }

      this.logger.debug(`Updating combo: ${id}`);

      // Preparar datos de actualización
      const { items, ...updateData } = updateDto;

      // Si se actualizan los items, eliminar los existentes y crear los nuevos
      if (items) {
        // Eliminar items existentes
        await this.prisma.comboItem.deleteMany({
          where: { comboId: id },
        });
      }

      return await this.prisma.combo.update({
        where: { id },
        data: {
          ...updateData,
          ...(items && {
            items: {
              create: items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          }),
        },
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
    } catch (error) {
      this.logger.error(`Error updating combo: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id); // Verificar que el combo existe
      this.logger.debug(`Deleting combo: ${id}`);
      return await this.prisma.combo.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting combo: ${error.message}`, error.stack);
      throw error;
    }
  }

  async calculateTotalPrice(comboId: string): Promise<number> {
    const combo = await this.findOne(comboId);
    let total = 0;

    for (const item of combo.items) {
      total += item.product.price * item.quantity;
    }

    return total;
  }

  async getSavings(comboId: string): Promise<number> {
    const combo = await this.findOne(comboId);
    const totalPrice = await this.calculateTotalPrice(comboId);
    return totalPrice - combo.offerPrice;
  }
}

