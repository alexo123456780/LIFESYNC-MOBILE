-- LifeSync Demo Backup SQL (LM-91)
-- Generado para recuperación rápida de las estaciones de evaluación

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Esquema y tablas base
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "HealthProfile" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "bloodType" TEXT,
    "notes" VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS "Allergy" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "severity" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Medication" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "dose" VARCHAR(50) NOT NULL,
    "frequencyHours" INTEGER NOT NULL,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "EmergencyContact" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "relationship" VARCHAR(50) NOT NULL
);

-- Datos demo
INSERT INTO "User" ("id", "email", "passwordHash") VALUES
('demo-user-uuid', 'paciente.demo@lifesync.dev', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash$dummyhash')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "HealthProfile" ("userId", "bloodType", "notes") VALUES
('demo-user-uuid', 'O_POS', 'Paciente con asma leve y alergia a penicilina. No suspender medicación controlada.')
ON CONFLICT ("userId") DO UPDATE SET "bloodType" = EXCLUDED."bloodType", "notes" = EXCLUDED."notes";

INSERT INTO "Allergy" ("userId", "name", "severity") VALUES
('demo-user-uuid', 'Penicilina', 'SEVERE'),
('demo-user-uuid', 'Polen', 'MILD');

INSERT INTO "Medication" ("userId", "name", "dose", "frequencyHours", "controlled", "startsAt") VALUES
('demo-user-uuid', 'Insulina Rápida', '10 UI', 8, true, NOW()),
('demo-user-uuid', 'Salbutamol Inhalador', '100 mcg (2 disparos)', 6, false, NOW());

INSERT INTO "EmergencyContact" ("userId", "name", "phone", "relationship") VALUES
('demo-user-uuid', 'María López', '+52 55 1234 5678', 'Madre'),
('demo-user-uuid', 'Dr. Roberto González', '+52 55 8765 4321', 'Médico Tratante');
