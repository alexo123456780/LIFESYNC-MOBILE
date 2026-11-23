import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaClient } from '../generated/prisma/client.js';

export interface UserProfileResponse {
  id: string;
  email: string;
  createdAt: Date;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaClient) {}

  /** Devuelve únicamente los datos públicos del usuario autenticado (nunca `passwordHash`). */
  @Get('me')
  async me(@CurrentUser() userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
