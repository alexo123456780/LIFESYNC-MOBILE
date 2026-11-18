import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { hashPassword } from '../password-hasher.js';
import type { RegisterDto } from './register.dto.js';

export interface RegisteredUser {
  id: string;
  email: string;
  createdAt: Date;
}

/** Código de Prisma para una violación de restricción única. */
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class RegisterService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(dto: RegisterDto): Promise<RegisteredUser> {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await hashPassword(dto.password);
    try {
      // `select` deja fuera passwordHash: la respuesta nunca lo expone.
      return await this.prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true, createdAt: true },
      });
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('El correo ya está registrado');
      }
      throw error;
    }
  }
}
