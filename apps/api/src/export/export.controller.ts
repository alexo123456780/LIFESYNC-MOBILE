import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { ExportFormat } from './export.service.js';
import { ExportService } from './export.service.js';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  async exportData(
    @CurrentUser() userId: string,
    @Query('format') format: ExportFormat = 'json',
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.exportService.exportData(userId, format);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }
}
