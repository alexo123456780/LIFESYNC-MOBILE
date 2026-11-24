import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import type { CreateIncidentLocationDto } from './dto/create-incident-location.dto.js';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaClient) {}

  async recordLocation(userId: string, dto: CreateIncidentLocationDto) {
    return this.prisma.incidentLocation.create({
      data: {
        userId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        recordedAt: new Date(dto.recordedAt),
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        recordedAt: true,
      },
    });
  }

  async listLocations(userId: string) {
    return this.prisma.incidentLocation.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    });
  }
}
