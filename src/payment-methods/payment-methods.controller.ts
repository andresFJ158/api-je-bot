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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  private readonly logger = new Logger(PaymentMethodsController.name);

  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  async create(@Body() createPaymentMethodDto: CreatePaymentMethodDto) {
    try {
      this.logger.debug(`POST /payment-methods - Creating: ${createPaymentMethodDto.name}`);
      return await this.paymentMethodsService.create(createPaymentMethodDto);
    } catch (error) {
      this.logger.error(`Error in create: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string) {
    try {
      this.logger.debug(`GET /payment-methods${activeOnly ? '?activeOnly=true' : ''}`);
      return await this.paymentMethodsService.findAll(activeOnly === 'true');
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('type/:type')
  async findByType(
    @Param('type') type: 'QR' | 'BANK_ACCOUNT',
    @Query('activeOnly') activeOnly?: string,
  ) {
    try {
      this.logger.debug(`GET /payment-methods/type/${type}${activeOnly ? '?activeOnly=true' : ''}`);
      return await this.paymentMethodsService.findByType(type, activeOnly === 'true');
    } catch (error) {
      this.logger.error(`Error in findByType: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.paymentMethodsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto,
  ) {
    try {
      this.logger.debug(`PATCH /payment-methods/${id}`);
      return await this.paymentMethodsService.update(id, updatePaymentMethodDto);
    } catch (error) {
      this.logger.error(`Error in update: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.debug(`DELETE /payment-methods/${id}`);
      return await this.paymentMethodsService.remove(id);
    } catch (error) {
      this.logger.error(`Error in remove: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('upload-qr')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/qr',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `qr-${uniqueSuffix}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadQR(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const fileUrl = `/uploads/qr/${file.filename}`;
    this.logger.debug(`QR image uploaded: ${fileUrl}`);

    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }
}

