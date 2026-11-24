import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/** Detecta tipo MIME real a partir de los magic bytes del buffer. */
export function detectImageMagicBytes(
  buffer: Buffer,
): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!Buffer.isBuffer(buffer) || buffer.byteLength < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.byteLength >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.byteLength >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    userId: string,
    fileBuffer: Buffer,
  ): Promise<{ id: string; mimeType: string; sizeBytes: number }> {
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.byteLength === 0) {
      throw new BadRequestException('El archivo de receta está vacío');
    }

    const sizeBytes = fileBuffer.byteLength;
    if (sizeBytes > MAX_SIZE_BYTES) {
      throw new HttpException(
        'El archivo supera el límite permitido de 2 MB',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const mimeType = detectImageMagicBytes(fileBuffer);
    if (!mimeType) {
      throw new BadRequestException(
        'Formato de imagen inválido. Solo se admiten archivos JPEG, PNG o WebP verificados por magic bytes.',
      );
    }

    const record = await this.prisma.prescription.create({
      data: {
        userId,
        mimeType,
        sizeBytes,
        data: new Uint8Array(fileBuffer),
      },
      select: {
        id: true,
        mimeType: true,
        sizeBytes: true,
      },
    });

    return record;
  }

  async findOne(userId: string, id: string): Promise<{ mimeType: string; data: Buffer }> {
    // Control de propiedad anti-IDOR: busca estrictamente por { id, userId }
    const record = await this.prisma.prescription.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        mimeType: true,
        data: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Receta médica no encontrada');
    }

    return {
      mimeType: record.mimeType,
      data: Buffer.from(record.data),
    };
  }

  async list(userId: string) {
    return this.prisma.prescription.findMany({
      where: { userId },
      select: {
        id: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
