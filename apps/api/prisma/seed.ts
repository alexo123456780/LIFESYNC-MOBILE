import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { assertSeedAllowed } from './seed-guard.js';

async function main(): Promise<void> {
  assertSeedAllowed(process.env);

  const password = process.env.SEED_USER_PASSWORD;
  if (!password) {
    throw new Error('Define SEED_USER_PASSWORD para crear el usuario de desarrollo');
  }
  const email = process.env.SEED_USER_EMAIL ?? 'demo@lifesync.dev';
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await prisma.user.upsert({ where: { email }, update: {}, create: { email, passwordHash } });
    console.log(`Seed aplicado: usuario ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
