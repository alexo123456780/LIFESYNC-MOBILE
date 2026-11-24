import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectImageMagicBytes, PrescriptionsService } from './prescriptions.service.js';

describe('PrescriptionsService (LM-95, LM-96)', () => {
  let service: PrescriptionsService;
  let mockPrisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockPrisma = {
      prescription: {
        create: vi
          .fn()
          .mockImplementation(({ data }: { data: { mimeType: string; sizeBytes: number } }) =>
            Promise.resolve({
              id: 'rx-1',
              mimeType: data.mimeType,
              sizeBytes: data.sizeBytes,
            }),
          ),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new PrescriptionsService(mockPrisma as never);
  });

  describe('detectImageMagicBytes', () => {
    it('detecta JPEG (FF D8 FF)', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectImageMagicBytes(buf)).toBe('image/jpeg');
    });

    it('detecta PNG (89 50 4E 47 0D 0A 1A 0A)', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectImageMagicBytes(buf)).toBe('image/png');
    });

    it('detecta WebP (RIFF...WEBP)', () => {
      const buf = Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ');
      expect(detectImageMagicBytes(buf)).toBe('image/webp');
    });

    it('rechaza ejecutables MZ (.exe disfrazado)', () => {
      const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      expect(detectImageMagicBytes(buf)).toBeNull();
    });
  });

  describe('create (POST /prescriptions)', () => {
    it('guarda una imagen válida asociada al usuario del token', async () => {
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x12, 0x34]);
      const res = await service.create('user-1', jpegBuf);
      expect(res.id).toBe('rx-1');
      expect(res.mimeType).toBe('image/jpeg');
      expect(res.sizeBytes).toBe(jpegBuf.length);
      expect(mockPrisma.prescription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          mimeType: 'image/jpeg',
          sizeBytes: jpegBuf.length,
        }),
        select: { id: true, mimeType: true, sizeBytes: true },
      });
    });

    it('rechaza archivos que superen los 2 MB con 413 Payload Too Large', async () => {
      const oversizedBuf = Buffer.alloc(2 * 1024 * 1024 + 1);
      oversizedBuf[0] = 0xff;
      oversizedBuf[1] = 0xd8;
      oversizedBuf[2] = 0xff;

      await expect(service.create('user-1', oversizedBuf)).rejects.toThrow(
        new HttpException(
          'El archivo supera el límite permitido de 2 MB',
          HttpStatus.PAYLOAD_TOO_LARGE,
        ),
      );
    });

    it('rechaza archivos no reconocidos (.exe renombrado a .jpg) con 400', async () => {
      const fakeExeBuf = Buffer.from([0x4d, 0x5a, 0x00, 0x00]);
      await expect(service.create('user-1', fakeExeBuf)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne (GET /prescriptions/:id - Anti-IDOR)', () => {
    it('devuelve la imagen si pertenece al usuario', async () => {
      const fakeData = Buffer.from([0xff, 0xd8, 0xff]);
      mockPrisma.prescription.findFirst.mockResolvedValue({
        mimeType: 'image/jpeg',
        data: fakeData,
      });

      const res = await service.findOne('user-1', 'rx-1');
      expect(res.mimeType).toBe('image/jpeg');
      expect(res.data).toEqual(fakeData);
      expect(mockPrisma.prescription.findFirst).toHaveBeenCalledWith({
        where: { id: 'rx-1', userId: 'user-1' },
        select: { mimeType: true, data: true },
      });
    });

    it('lanza NotFoundException (404) si el id no existe o pertenece a otro usuario', async () => {
      mockPrisma.prescription.findFirst.mockResolvedValue(null);
      await expect(service.findOne('user-attacker', 'rx-1')).rejects.toThrow(NotFoundException);
    });
  });
});
