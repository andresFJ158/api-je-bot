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
import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quick-replies')
@UseGuards(JwtAuthGuard)
export class QuickRepliesController {
  private readonly logger = new Logger(QuickRepliesController.name);

  constructor(private readonly quickRepliesService: QuickRepliesService) {}

  @Post()
  async create(@Body() createQuickReplyDto: CreateQuickReplyDto) {
    try {
      this.logger.debug(`POST /quick-replies - Creating quick reply: ${createQuickReplyDto.title}`);
      return await this.quickRepliesService.create(createQuickReplyDto);
    } catch (error) {
      this.logger.error(`Error in create: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  async findAll(@Query('category') category?: string) {
    try {
      this.logger.debug(`GET /quick-replies${category ? `?category=${category}` : ''}`);
      return await this.quickRepliesService.findAll(category);
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('categories')
  async getCategories() {
    try {
      this.logger.debug('GET /quick-replies/categories');
      return await this.quickRepliesService.getCategories();
    } catch (error) {
      this.logger.error(`Error in getCategories: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.quickRepliesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateQuickReplyDto: UpdateQuickReplyDto) {
    try {
      this.logger.debug(`PATCH /quick-replies/${id}`);
      return await this.quickRepliesService.update(id, updateQuickReplyDto);
    } catch (error) {
      this.logger.error(`Error in update: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.debug(`DELETE /quick-replies/${id}`);
      return await this.quickRepliesService.remove(id);
    } catch (error) {
      this.logger.error(`Error in remove: ${error.message}`, error.stack);
      throw error;
    }
  }
}

