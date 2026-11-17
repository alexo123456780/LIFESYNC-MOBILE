import { Test } from '@nestjs/testing';
import { PrismaClient } from '../generated/prisma/client.js';
import { DatabaseConnection } from './database-connection.js';
import { DatabaseModule } from './database.module.js';

describe('DatabaseConnection', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://usuario@localhost:5432/db';
  });

  it('getInstance devuelve siempre la misma instancia', () => {
    expect(DatabaseConnection.getInstance()).toBe(DatabaseConnection.getInstance());
    // En Prisma 7 PrismaClient es una fábrica: instanceof no aplica, se comprueba su API.
    expect(typeof DatabaseConnection.getInstance().client.$disconnect).toBe('function');
  });

  it('su constructor es privado: new fuera de la clase no compila', () => {
    const crear = () => {
      // @ts-expect-error TS2673: el constructor de DatabaseConnection es privado
      return new DatabaseConnection();
    };
    expect(crear).toBeInstanceOf(Function);
  });

  it('DatabaseModule inyecta el PrismaClient del Singleton', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] }).compile();
    expect(moduleRef.get(PrismaClient)).toBe(DatabaseConnection.getInstance().client);
    await moduleRef.close();
  });
});
