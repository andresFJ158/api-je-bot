import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateProductDto) {
    try {
      this.logger.debug(`Creating product: ${createDto.name}`);
      
      // Verify category exists if provided
      if (createDto.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: createDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException('Categoría no encontrada');
        }
      }

      return await this.prisma.product.create({
        data: {
          name: createDto.name,
          price: createDto.price,
          description: createDto.description,
          stock: 0, // Stock siempre inicia en 0, se modifica solo mediante transacciones de inventario
          categoryId: createDto.categoryId || undefined,
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
        },
      });
    } catch (error) {
      this.logger.error(`Error creating product: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(categoryId?: string) {
    try {
      this.logger.debug(`Finding products${categoryId ? ` with categoryId: ${categoryId}` : ''}`);
      return await this.prisma.product.findMany({
        where: {
          ...(categoryId && { categoryId }),
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
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error finding products: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
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
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateDto: UpdateProductDto) {
    try {
      await this.findOne(id); // Verify product exists
      
      // Verify category exists if provided
      if (updateDto.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: updateDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException('Categoría no encontrada');
        }
      }

      this.logger.debug(`Updating product: ${id}`);
      // Excluir stock del updateDto - el stock solo se modifica mediante transacciones de inventario
      const { stock, ...updateData } = updateDto as any;
      return await this.prisma.product.update({
        where: { id },
        data: updateData,
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
      });
    } catch (error) {
      this.logger.error(`Error updating product: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id); // Verify product exists
      this.logger.debug(`Deleting product: ${id}`);
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting product: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByCategory(categoryId: string) {
    try {
      this.logger.debug(`Finding products by category: ${categoryId}`);
      return await this.prisma.product.findMany({
        where: { categoryId },
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
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error finding products by category: ${error.message}`, error.stack);
      throw error;
    }
  }
}

