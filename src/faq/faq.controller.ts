import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { FAQService } from './faq.service';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { ReorderFAQsDto } from './dto/reorder-faqs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('faqs')
@UseGuards(JwtAuthGuard)
export class FAQController {
  private readonly logger = new Logger(FAQController.name);

  constructor(private faqService: FAQService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.faqService.findAll(includeInactiveBool);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  @Post()
  async create(@Body() createFAQDto: CreateFAQDto) {
    return this.faqService.create(createFAQDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateFAQDto: UpdateFAQDto) {
    return this.faqService.update(id, updateFAQDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.faqService.delete(id);
  }

  @Post('reorder')
  async reorder(@Body() reorderDto: ReorderFAQsDto) {
    return this.faqService.reorder(reorderDto.ids);
  }
}

