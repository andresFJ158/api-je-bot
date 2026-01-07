import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Logger,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
    try {
      this.logger.debug(`POST /orders - Creating order for branch: ${createOrderDto.branchId}`);
      const agentId = req.user?.id; // ID del agente autenticado
      return await this.ordersService.create(createOrderDto, agentId);
    } catch (error) {
      this.logger.error(`Error in create: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      this.logger.debug('GET /orders');
      const filters: any = {};
      if (branchId) filters.branchId = branchId;
      if (userId) filters.userId = userId;
      if (status) filters.status = status;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      return await this.ordersService.findAll(filters);
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('stats')
  async getStats(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      this.logger.debug('GET /orders/stats');
      return await this.ordersService.getStats(
        branchId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
    } catch (error) {
      this.logger.error(`Error in getStats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.ordersService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    try {
      this.logger.debug(`PATCH /orders/${id}`);
      return await this.ordersService.update(id, updateOrderDto);
    } catch (error) {
      this.logger.error(`Error in update: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req: any) {
    try {
      this.logger.debug(`POST /orders/${id}/cancel`);
      const agentId = req.user?.id; // ID del agente que cancela
      return await this.ordersService.cancel(id, agentId);
    } catch (error) {
      this.logger.error(`Error in cancel: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.debug(`DELETE /orders/${id}`);
      return await this.ordersService.remove(id);
    } catch (error) {
      this.logger.error(`Error in remove: ${error.message}`, error.stack);
      throw error;
    }
  }
}

