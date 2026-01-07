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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { FindNearestBranchDto } from './dto/find-nearest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
    private readonly logger = new Logger(BranchesController.name);

    constructor(private readonly branchesService: BranchesService) { }

    @Post()
    async create(@Body() createBranchDto: CreateBranchDto) {
        try {
            this.logger.debug(`POST /branches - Creating branch: ${createBranchDto.name}`);
            return await this.branchesService.create(createBranchDto);
        } catch (error) {
            this.logger.error(`Error in create: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get()
    async findAll(@Query('activeOnly') activeOnly?: string) {
        try {
            this.logger.debug(`GET /branches${activeOnly ? '?activeOnly=true' : ''}`);
            return await this.branchesService.findAll(activeOnly === 'true');
        } catch (error) {
            this.logger.error(`Error in findAll: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get('nearest')
    async findNearest(@Query() query: FindNearestBranchDto) {
        try {
            this.logger.debug(`GET /branches/nearest - lat: ${query.latitude}, lng: ${query.longitude}`);
            return await this.branchesService.findNearest(query.latitude, query.longitude);
        } catch (error) {
            this.logger.error(`Error in findNearest: ${error.message}`, error.stack);
            throw error;
        }
    }

  @Post('nearest-from-url')
  async findNearestFromUrl(@Body() body: { url: string }) {
    try {
      this.logger.debug(`POST /branches/nearest-from-url - URL: ${body.url}`);
      const coords = await this.branchesService.extractCoordinatesFromGoogleMaps(body.url);
      
      if (!coords) {
        return {
          success: false,
          message: 'No se pudieron extraer las coordenadas del enlace de Google Maps. Asegúrate de que el enlace sea válido.',
        };
      }

      this.logger.debug(`Extracted coordinates: ${coords.latitude}, ${coords.longitude}`);
      const nearest = await this.branchesService.findNearest(coords.latitude, coords.longitude);
      
      return {
        success: true,
        coordinates: coords,
        branch: nearest,
      };
    } catch (error) {
      this.logger.error(`Error in findNearestFromUrl: ${error.message}`, error.stack);
      throw error;
    }
  }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return await this.branchesService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
        try {
            this.logger.debug(`PATCH /branches/${id}`);
            return await this.branchesService.update(id, updateBranchDto);
        } catch (error) {
            this.logger.error(`Error in update: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        try {
            this.logger.debug(`DELETE /branches/${id}`);
            return await this.branchesService.remove(id);
        } catch (error) {
            this.logger.error(`Error in remove: ${error.message}`, error.stack);
            throw error;
        }
    }
}

