import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  UpdateProfileDto,
  UpsertAllergyDto,
  UpsertContactDto,
  UpsertMedicationDto,
} from './dto/health-records.dto.js';
import { HealthRecordsService } from './health-records.service.js';

@Controller('health-records')
@UseGuards(JwtAuthGuard)
export class HealthRecordsController {
  constructor(private readonly service: HealthRecordsService) {}

  @Get('profile')
  getProfile(@CurrentUser() userId: string) {
    return this.service.getProfile(userId);
  }

  @Put('profile')
  upsertProfile(@CurrentUser() userId: string, @Body() dto: UpdateProfileDto) {
    return this.service.upsertProfile(userId, dto);
  }

  @Get('allergies')
  listAllergies(@CurrentUser() userId: string) {
    return this.service.listAllergies(userId);
  }

  @Post('allergies')
  createAllergy(@CurrentUser() userId: string, @Body() dto: UpsertAllergyDto) {
    return this.service.createAllergy(userId, dto);
  }

  @Put('allergies/:id')
  updateAllergy(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpsertAllergyDto,
  ) {
    return this.service.updateAllergy(userId, id, dto);
  }

  @Delete('allergies/:id')
  @HttpCode(204)
  deleteAllergy(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.service.deleteAllergy(userId, id);
  }

  @Get('medications')
  listMedications(@CurrentUser() userId: string) {
    return this.service.listMedications(userId);
  }

  @Post('medications')
  createMedication(@CurrentUser() userId: string, @Body() dto: UpsertMedicationDto) {
    return this.service.createMedication(userId, dto);
  }

  @Put('medications/:id')
  updateMedication(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpsertMedicationDto,
  ) {
    return this.service.updateMedication(userId, id, dto);
  }

  @Delete('medications/:id')
  @HttpCode(204)
  deleteMedication(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.service.deleteMedication(userId, id);
  }

  @Get('contacts')
  listContacts(@CurrentUser() userId: string) {
    return this.service.listContacts(userId);
  }

  @Post('contacts')
  createContact(@CurrentUser() userId: string, @Body() dto: UpsertContactDto) {
    return this.service.createContact(userId, dto);
  }

  @Put('contacts/:id')
  updateContact(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpsertContactDto,
  ) {
    return this.service.updateContact(userId, id, dto);
  }

  @Delete('contacts/:id')
  @HttpCode(204)
  deleteContact(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.service.deleteContact(userId, id);
  }
}
