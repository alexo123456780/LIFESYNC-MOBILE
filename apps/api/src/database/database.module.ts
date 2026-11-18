import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { DatabaseConnection } from './database-connection.js';

@Global()
@Module({
  providers: [{ provide: PrismaClient, useFactory: () => DatabaseConnection.getInstance().client }],
  exports: [PrismaClient],
})
export class DatabaseModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await DatabaseConnection.getInstance().client.$disconnect();
  }
}
