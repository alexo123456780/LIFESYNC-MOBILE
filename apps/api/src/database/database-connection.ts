import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/** Singleton que envuelve al PrismaClient (RF-B01, PRD 9.1). */
export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  readonly client: PrismaClient;

  private constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    this.client = new PrismaClient({ adapter });
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
}
