import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    try {
      this.logger.debug(`POST /categories - Creating category: ${createCategoryDto.name}`);
      return await this.categoriesService.createCategory(createCategoryDto);
    } catch (error) {
      this.logger.error(`Error in createCategory: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  async findAllCategories(@Query('parentId') parentId?: string) {
    try {
      this.logger.debug(`GET /categories${parentId ? `?parentId=${parentId}` : ''}`);
      return await this.categoriesService.findAllCategories(parentId);
    } catch (error) {
      this.logger.error(`Error in findAllCategories: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('tree')
  async findCategoryTree() {
    try {
      this.logger.debug('GET /categories/tree');
      return await this.categoriesService.findCategoryTree();
    } catch (error) {
      this.logger.error(`Error in findCategoryTree: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('flat')
  async findAllFlat() {
    try {
      this.logger.debug('GET /categories/flat');
      return await this.categoriesService.findAllFlat();
    } catch (error) {
      this.logger.error(`Error in findAllFlat: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOneCategory(@Param('id') id: string) {
    return await this.categoriesService.findOneCategory(id);
  }

  @Patch(':id')
  async updateCategory(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    try {
      this.logger.debug(`PATCH /categories/${id}`);
      return await this.categoriesService.updateCategory(id, updateCategoryDto);
    } catch (error) {
      this.logger.error(`Error in updateCategory: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  async removeCategory(@Param('id') id: string) {
    try {
      this.logger.debug(`DELETE /categories/${id}`);
      return await this.categoriesService.removeCategory(id);
    } catch (error) {
      this.logger.error(`Error in removeCategory: ${error.message}`, error.stack);
      throw error;
    }
  }
}
