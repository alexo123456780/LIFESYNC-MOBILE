import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrescriptionsService } from './prescriptions.service.js';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @CurrentUser() userId: string,
    @Body() body: { data?: string },
    @Req() req: Request,
  ) {
    let buffer: Buffer;
    if (body && typeof body.data === 'string') {
      buffer = Buffer.from(body.data, 'base64');
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else {
      buffer = Buffer.from('');
    }

    return this.service.create(userId, buffer);
  }

  @Get()
  async list(@CurrentUser() userId: string) {
    return this.service.list(userId);
  }

  @Get(':id')
  async getOne(@CurrentUser() userId: string, @Param('id') id: string, @Res() res: Response) {
    const { mimeType, data } = await this.service.findOne(userId, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', data.length);
    res.send(data);
  }
}
