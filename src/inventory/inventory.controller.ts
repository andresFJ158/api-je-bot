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
import { InventoryService } from './inventory.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Post('transactions')
  async createTransaction(@Body() createDto: CreateInventoryTransactionDto) {
    try {
      this.logger.debug(`POST /inventory/transactions - Creating ${createDto.type} transaction`);
      return await this.inventoryService.createTransaction(createDto);
    } catch (error) {
      this.logger.error(`Error in createTransaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('transactions')
  async findAllTransactions(
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('agentId') agentId?: string,
  ) {
    try {
      this.logger.debug(
        `GET /inventory/transactions${productId ? `?productId=${productId}` : ''}${type ? `&type=${type}` : ''}`,
      );
      return await this.inventoryService.findAllTransactions(productId, type, agentId);
    } catch (error) {
      this.logger.error(`Error in findAllTransactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('transactions/:id')
  async findOneTransaction(@Param('id') id: string) {
    return await this.inventoryService.findOneTransaction(id);
  }

  @Patch('transactions/:id')
  async updateTransaction(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryTransactionDto,
  ) {
    try {
      this.logger.debug(`PATCH /inventory/transactions/${id}`);
      return await this.inventoryService.updateTransaction(id, updateDto);
      } catch (error) {
      this.logger.error(`Error in updateTransaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete('transactions/:id')
  async removeTransaction(@Param('id') id: string) {
    try {
      this.logger.debug(`DELETE /inventory/transactions/${id}`);
      return await this.inventoryService.removeTransaction(id);
    } catch (error) {
      this.logger.error(`Error in removeTransaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('summary')
  async getInventorySummary() {
    try {
      this.logger.debug('GET /inventory/summary');
      return await this.inventoryService.getInventorySummary();
    } catch (error) {
      this.logger.error(`Error in getInventorySummary: ${error.message}`, error.stack);
      throw error;
    }
  }
}

