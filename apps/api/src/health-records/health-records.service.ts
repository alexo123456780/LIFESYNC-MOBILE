import { BadRequestException, Injectable } from '@nestjs/common';
import { assertOwnedMutation, assertOwnedRecord, ownedWhere } from '../common/ownership.js';
import { type BloodType, PrismaClient } from '../generated/prisma/client.js';
import type {
  UpdateProfileDto,
  UpsertAllergyDto,
  UpsertContactDto,
  UpsertMedicationDto,
} from './dto/health-records.dto.js';

export interface HealthProfileResponse {
  id: string | null;
  bloodType: BloodType | null;
  notes: string | null;
}

@Injectable()
export class HealthRecordsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getProfile(userId: string): Promise<HealthProfileResponse> {
    const profile = await this.prisma.healthProfile.findUnique({
      where: { userId },
      select: { id: true, bloodType: true, notes: true },
    });
    return profile ?? { id: null, bloodType: null, notes: null };
  }

  async upsertProfile(userId: string, dto: UpdateProfileDto): Promise<HealthProfileResponse> {
    const bloodType = dto.bloodType ?? null;
    const notes = dto.notes?.trim() ? dto.notes.trim() : null;
    return this.prisma.healthProfile.upsert({
      where: { userId },
      create: { userId, bloodType, notes },
      update: { bloodType, notes },
      select: { id: true, bloodType: true, notes: true },
    });
  }

  listAllergies(userId: string) {
    return this.prisma.allergy.findMany({
      where: { userId },
      select: { id: true, name: true, severity: true },
      orderBy: { name: 'asc' },
    });
  }

  createAllergy(userId: string, dto: UpsertAllergyDto) {
    return this.prisma.allergy.create({
      data: { userId, name: dto.name.trim(), severity: dto.severity },
      select: { id: true, name: true, severity: true },
    });
  }

  async updateAllergy(userId: string, id: string, dto: UpsertAllergyDto) {
    const res = await this.prisma.allergy.updateMany({
      where: ownedWhere(id, userId),
      data: { name: dto.name.trim(), severity: dto.severity },
    });
    assertOwnedMutation(res.count);
    const updated = await this.prisma.allergy.findFirst({
      where: ownedWhere(id, userId),
      select: { id: true, name: true, severity: true },
    });
    return assertOwnedRecord(updated);
  }

  async deleteAllergy(userId: string, id: string): Promise<void> {
    const res = await this.prisma.allergy.deleteMany({ where: ownedWhere(id, userId) });
    assertOwnedMutation(res.count);
  }

  listMedications(userId: string) {
    return this.prisma.medication.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        dose: true,
        frequencyHours: true,
        controlled: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  createMedication(userId: string, dto: UpsertMedicationDto) {
    const { startsAt, endsAt } = this.parseMedicationDates(dto);
    return this.prisma.medication.create({
      data: {
        userId,
        name: dto.name.trim(),
        dose: dto.dose.trim(),
        frequencyHours: dto.frequencyHours,
        controlled: dto.controlled ?? false,
        startsAt,
        endsAt,
      },
      select: {
        id: true,
        name: true,
        dose: true,
        frequencyHours: true,
        controlled: true,
        startsAt: true,
        endsAt: true,
      },
    });
  }

  async updateMedication(userId: string, id: string, dto: UpsertMedicationDto) {
    const { startsAt, endsAt } = this.parseMedicationDates(dto);
    const res = await this.prisma.medication.updateMany({
      where: ownedWhere(id, userId),
      data: {
        name: dto.name.trim(),
        dose: dto.dose.trim(),
        frequencyHours: dto.frequencyHours,
        controlled: dto.controlled ?? false,
        startsAt,
        endsAt,
      },
    });
    assertOwnedMutation(res.count);
    const updated = await this.prisma.medication.findFirst({
      where: ownedWhere(id, userId),
      select: {
        id: true,
        name: true,
        dose: true,
        frequencyHours: true,
        controlled: true,
        startsAt: true,
        endsAt: true,
      },
    });
    return assertOwnedRecord(updated);
  }

  async deleteMedication(userId: string, id: string): Promise<void> {
    const res = await this.prisma.medication.deleteMany({ where: ownedWhere(id, userId) });
    assertOwnedMutation(res.count);
  }

  listContacts(userId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { userId },
      select: { id: true, name: true, phone: true, relationship: true },
      orderBy: { name: 'asc' },
    });
  }

  createContact(userId: string, dto: UpsertContactDto) {
    return this.prisma.emergencyContact.create({
      data: {
        userId,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        relationship: dto.relationship.trim(),
      },
      select: { id: true, name: true, phone: true, relationship: true },
    });
  }

  async updateContact(userId: string, id: string, dto: UpsertContactDto) {
    const res = await this.prisma.emergencyContact.updateMany({
      where: ownedWhere(id, userId),
      data: {
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        relationship: dto.relationship.trim(),
      },
    });
    assertOwnedMutation(res.count);
    const updated = await this.prisma.emergencyContact.findFirst({
      where: ownedWhere(id, userId),
      select: { id: true, name: true, phone: true, relationship: true },
    });
    return assertOwnedRecord(updated);
  }

  async deleteContact(userId: string, id: string): Promise<void> {
    const res = await this.prisma.emergencyContact.deleteMany({ where: ownedWhere(id, userId) });
    assertOwnedMutation(res.count);
  }

  private parseMedicationDates(dto: UpsertMedicationDto): { startsAt: Date; endsAt: Date | null } {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt.getTime() < startsAt.getTime()) {
      throw new BadRequestException('endsAt no puede ser anterior a startsAt');
    }
    return { startsAt, endsAt };
  }
}
