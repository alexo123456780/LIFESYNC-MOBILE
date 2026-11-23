import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BloodType, Severity } from '../../generated/prisma/client.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class UpsertAllergyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(Severity)
  severity!: Severity;
}

export class UpsertMedicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  dose!: string;

  @IsInt()
  @Min(1)
  frequencyHours!: number;

  @IsOptional()
  @IsBoolean()
  controlled?: boolean;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}

export class UpsertContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  relationship!: string;
}
