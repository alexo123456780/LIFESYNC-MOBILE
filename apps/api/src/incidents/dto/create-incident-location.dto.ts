import { IsISO8601, IsNumber, Max, Min } from 'class-validator';

export class CreateIncidentLocationDto {
  @IsNumber()
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitude!: number;

  @IsNumber()
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitude!: number;

  @IsISO8601({}, { message: 'recordedAt debe ser una fecha en formato ISO8601' })
  recordedAt!: string;
}
