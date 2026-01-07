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
import { CombosService } from './combos.service';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('combos')
@UseGuards(JwtAuthGuard)
export class CombosController {
  private readonly logger = new Logger(CombosController.name);

  constructor(private readonly combosService: CombosService) {}

  @Post()
  async create(@Body() createComboDto: CreateComboDto) {
    try {
      this.logger.debug(`POST /combos - Creating combo: ${createComboDto.name}`);
      return await this.combosService.create(createComboDto);
    } catch (error) {
      this.logger.error(`Error in create: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    try {
      this.logger.debug(`GET /combos${categoryId ? `?categoryId=${categoryId}` : ''}`);
      return await this.combosService.findAll(
        categoryId,
        includeInactive === 'true',
      );
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.combosService.findOne(id);
  }

  @Get(':id/total-price')
  async getTotalPrice(@Param('id') id: string) {
    const totalPrice = await this.combosService.calculateTotalPrice(id);
    return { totalPrice };
  }

  @Get(':id/savings')
  async getSavings(@Param('id') id: string) {
    const savings = await this.combosService.getSavings(id);
    return { savings };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateComboDto: UpdateComboDto) {
    try {
      this.logger.debug(`PATCH /combos/${id}`);
      return await this.combosService.update(id, updateComboDto);
    } catch (error) {
      this.logger.error(`Error in update: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.debug(`DELETE /combos/${id}`);
      return await this.combosService.remove(id);
    } catch (error) {
      this.logger.error(`Error in remove: ${error.message}`, error.stack);
      throw error;
    }
  }
}

