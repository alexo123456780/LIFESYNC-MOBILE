import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateIncidentLocationDto } from './dto/create-incident-location.dto.js';
import { IncidentsService } from './incidents.service.js';

@Controller('incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post('location')
  @HttpCode(HttpStatus.CREATED)
  async recordLocation(@CurrentUser() userId: string, @Body() dto: CreateIncidentLocationDto) {
    return this.incidentsService.recordLocation(userId, dto);
  }

  @Get('locations')
  async listLocations(@CurrentUser() userId: string) {
    return this.incidentsService.listLocations(userId);
  }
}
