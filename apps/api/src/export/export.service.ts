import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  EXPORT_STRATEGIES,
  type ExportResult,
  type ExportStrategy,
  type HealthSnapshot,
} from './export-strategy.interface.js';

export type ExportFormat = 'json' | 'csv' | string;

@Injectable()
export class ExportService {
  private readonly strategies = new Map<string, ExportStrategy>();

  constructor(
    private readonly prisma: PrismaClient,
    @Inject(EXPORT_STRATEGIES) strategyList: ExportStrategy[],
  ) {
    for (const s of strategyList) {
      this.strategies.set(s.format, s);
    }
  }

  async exportData(userId: string, format: ExportFormat): Promise<ExportResult> {
    const strategy = this.strategies.get(format);
    if (!strategy) {
      throw new BadRequestException(
        `Formato de exportación no soportado: ${format}. Use json o csv.`,
      );
    }

    const snapshot = await this.buildSnapshot(userId);
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return strategy.export(snapshot, userId, date);
  }

  private async buildSnapshot(userId: string): Promise<HealthSnapshot> {
    const [profile, allergies, medications, contacts] = await Promise.all([
      this.prisma.healthProfile.findUnique({
        where: { userId },
        select: { bloodType: true, notes: true },
      }),
      this.prisma.allergy.findMany({
        where: { userId },
        select: { name: true, severity: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.medication.findMany({
        where: { userId },
        select: {
          name: true,
          dose: true,
          frequencyHours: true,
          controlled: true,
          startsAt: true,
          endsAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.emergencyContact.findMany({
        where: { userId },
        select: { name: true, phone: true, relationship: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      profile,
      allergies,
      medications,
      contacts,
    };
  }
}
