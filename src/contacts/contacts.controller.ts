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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async create(@Body() createContactDto: CreateContactDto) {
    try {
      this.logger.debug(`POST /contacts - Creating contact: ${createContactDto.name}`);
      return await this.contactsService.create(createContactDto);
    } catch (error) {
      this.logger.error(`Error in create: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  async findAll(
    @Query('city') city?: string,
    @Query('search') search?: string,
  ) {
    try {
      this.logger.debug(`GET /contacts${city ? `?city=${city}` : ''}${search ? `&search=${search}` : ''}`);
      return await this.contactsService.findAll(city, search);
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('phone/:phone')
  async findByPhone(@Param('phone') phone: string) {
    try {
      this.logger.debug(`GET /contacts/phone/${phone}`);
      return await this.contactsService.findByPhone(phone);
    } catch (error) {
      this.logger.error(`Error in findByPhone: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('cities')
  async getCities() {
    try {
      this.logger.debug('GET /contacts/cities');
      return await this.contactsService.getCities();
    } catch (error) {
      this.logger.error(`Error in getCities: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('stats')
  async getStats() {
    try {
      this.logger.debug('GET /contacts/stats');
      return await this.contactsService.getStats();
    } catch (error) {
      this.logger.error(`Error in getStats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.contactsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    try {
      this.logger.debug(`PATCH /contacts/${id}`);
      return await this.contactsService.update(id, updateContactDto);
    } catch (error) {
      this.logger.error(`Error in update: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.debug(`DELETE /contacts/${id}`);
      return await this.contactsService.remove(id);
    } catch (error) {
      this.logger.error(`Error in remove: ${error.message}`, error.stack);
      throw error;
    }
  }
}

