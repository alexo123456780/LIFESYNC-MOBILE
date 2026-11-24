import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/password-hasher.js';
import { assertSeedAllowed } from './seed-guard.js';

async function main(): Promise<void> {
  assertSeedAllowed(process.env);

  const password = process.env.SEED_USER_PASSWORD ?? 'DemoPass123!';
  const email = process.env.SEED_USER_EMAIL ?? 'paciente.demo@lifesync.dev';
  const passwordHash = await hashPassword(password);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
    });

    // Perfil clínico
    await prisma.healthProfile.upsert({
      where: { userId: user.id },
      update: {
        bloodType: 'O_POS',
        notes: 'Paciente con asma leve y alergia a penicilina. No suspender medicación controlada.',
      },
      create: {
        userId: user.id,
        bloodType: 'O_POS',
        notes: 'Paciente con asma leve y alergia a penicilina. No suspender medicación controlada.',
      },
    });

    // Alergias
    await prisma.allergy.deleteMany({ where: { userId: user.id } });
    await prisma.allergy.createMany({
      data: [
        { userId: user.id, name: 'Penicilina', severity: 'SEVERE' },
        { userId: user.id, name: 'Polen', severity: 'MILD' },
      ],
    });

    // Medicamentos (incluye uno controlado)
    await prisma.medication.deleteMany({ where: { userId: user.id } });
    await prisma.medication.createMany({
      data: [
        {
          userId: user.id,
          name: 'Insulina Rápida',
          dose: '10 UI',
          frequencyHours: 8,
          controlled: true,
          startsAt: new Date('2026-01-01T08:00:00.000Z'),
        },
        {
          userId: user.id,
          name: 'Salbutamol Inhalador',
          dose: '100 mcg (2 disparos)',
          frequencyHours: 6,
          controlled: false,
          startsAt: new Date('2026-01-01T08:00:00.000Z'),
        },
      ],
    });

    // Contactos de emergencia
    await prisma.emergencyContact.deleteMany({ where: { userId: user.id } });
    await prisma.emergencyContact.createMany({
      data: [
        {
          userId: user.id,
          name: 'María López',
          phone: '+52 55 1234 5678',
          relationship: 'Madre',
        },
        {
          userId: user.id,
          name: 'Dr. Roberto González',
          phone: '+52 55 8765 4321',
          relationship: 'Médico Tratante',
        },
      ],
    });

    console.log(`Seed demo aplicado exitosamente para el usuario: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
