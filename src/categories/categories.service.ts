import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly MAX_DEPTH = 5;

  constructor(private prisma: PrismaService) {}

  /**
   * Calcula la profundidad de una categoría en la jerarquía
   */
  private async calculateDepth(categoryId: string): Promise<number> {
    let depth = 1;
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!category || !category.parentId) {
        break;
      }

      depth++;
      currentId = category.parentId;

      if (depth > this.MAX_DEPTH) {
        return depth;
      }
    }

    return depth;
  }

  /**
   * Obtiene la ruta completa de una categoría (todos sus ancestros)
   */
  private async getCategoryPath(categoryId: string): Promise<string[]> {
    const path: string[] = [];
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });

      if (!category) break;

      path.unshift(category.id);
      currentId = category.parentId;
    }

    return path;
  }

  async createCategory(createDto: CreateCategoryDto) {
    try {
      // Si tiene parentId, validar que existe y que no exceda el nivel máximo
      if (createDto.parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: createDto.parentId },
        });

        if (!parent) {
          throw new NotFoundException('Categoría padre no encontrada');
        }

        const parentDepth = await this.calculateDepth(createDto.parentId);
        if (parentDepth >= this.MAX_DEPTH) {
          throw new BadRequestException(
            `No se puede crear una categoría hija. La jerarquía ya alcanzó el nivel máximo de ${this.MAX_DEPTH} niveles.`,
          );
        }
      }

      this.logger.debug(`Creating category: ${createDto.name}${createDto.parentId ? ` (parent: ${createDto.parentId})` : ''}`);
      
      return await this.prisma.category.create({
        data: {
          name: createDto.name,
          description: createDto.description,
          parentId: createDto.parentId,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe una categoría con este nombre en el mismo nivel');
      }
      this.logger.error(`Error creating category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAllCategories(parentId?: string) {
    try {
      this.logger.debug(`Finding all categories${parentId ? ` with parent: ${parentId}` : ' (root level)'}`);
      
      return await this.prisma.category.findMany({
        where: parentId ? { parentId } : { parentId: null },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
            },
            orderBy: { name: 'asc' },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error finding categories: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene todas las categorías en formato de árbol jerárquico
   */
  async findCategoryTree() {
    try {
      this.logger.debug('Finding category tree');
      
      const allCategories = await this.prisma.category.findMany({
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Construir el árbol
      const categoryMap = new Map();
      const rootCategories: any[] = [];

      // Primero, crear un mapa de todas las categorías
      for (const cat of allCategories) {
        const depth = await this.calculateDepth(cat.id);
        categoryMap.set(cat.id, {
          ...cat,
          children: [],
          depth,
        });
      }

      // Luego, construir la jerarquía
      for (const cat of allCategories) {
        const categoryNode = categoryMap.get(cat.id);
        
        if (cat.parentId) {
          const parent = categoryMap.get(cat.parentId);
          if (parent) {
            parent.children.push(categoryNode);
          }
        } else {
          rootCategories.push(categoryNode);
        }
      }

      return rootCategories;
    } catch (error) {
      this.logger.error(`Error finding category tree: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOneCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
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
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                products: true,
                children: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Calcular profundidad
    const depth = await this.calculateDepth(id);
    return {
      ...category,
      depth,
    };
  }

  async updateCategory(id: string, updateDto: UpdateCategoryDto) {
    try {
      const existingCategory = await this.findOneCategory(id);

      // Si se está cambiando el parentId, validar
      if (updateDto.parentId !== undefined) {
        // No permitir que una categoría sea su propio padre
        if (updateDto.parentId === id) {
          throw new BadRequestException('Una categoría no puede ser su propio padre');
        }

        // Validar que el nuevo padre existe
        if (updateDto.parentId) {
          const newParent = await this.prisma.category.findUnique({
            where: { id: updateDto.parentId },
          });

          if (!newParent) {
            throw new NotFoundException('Categoría padre no encontrada');
          }

          // Validar que no se cree un ciclo
          const newParentPath = await this.getCategoryPath(updateDto.parentId);
          if (newParentPath.includes(id)) {
            throw new BadRequestException('No se puede crear un ciclo en la jerarquía de categorías');
          }

          // Validar profundidad máxima
          const newParentDepth = await this.calculateDepth(updateDto.parentId);
          if (newParentDepth >= this.MAX_DEPTH) {
            throw new BadRequestException(
              `No se puede mover la categoría aquí. La jerarquía ya alcanzó el nivel máximo de ${this.MAX_DEPTH} niveles.`,
            );
          }
        }
      }

      this.logger.debug(`Updating category: ${id}`);
      return await this.prisma.category.update({
        where: { id },
        data: updateDto,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe una categoría con este nombre en el mismo nivel');
      }
      this.logger.error(`Error updating category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeCategory(id: string) {
    try {
      const category = await this.findOneCategory(id);

      // Verificar si tiene hijos
      const childrenCount = await this.prisma.category.count({
        where: { parentId: id },
      });

      if (childrenCount > 0) {
        throw new BadRequestException(
          `No se puede eliminar la categoría porque tiene ${childrenCount} categoría(s) hija(s). Elimine primero las categorías hijas.`,
        );
      }

      // Verificar si tiene productos
      const productsCount = await this.prisma.product.count({
        where: { categoryId: id },
      });

      if (productsCount > 0) {
        throw new BadRequestException(
          `No se puede eliminar la categoría porque tiene ${productsCount} producto(s) asociado(s).`,
        );
      }

      this.logger.debug(`Deleting category: ${id}`);
      return await this.prisma.category.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting category: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene todas las categorías disponibles para selección (sin hijos anidados)
   */
  async findAllFlat() {
    try {
      this.logger.debug('Finding all categories (flat)');
      return await this.prisma.category.findMany({
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error finding flat categories: ${error.message}`, error.stack);
      throw error;
    }
  }
}
