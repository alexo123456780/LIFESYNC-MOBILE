import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import { validateEnv } from './common/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { ExportModule } from './export/export.module.js';
import { HealthModule } from './health/health.module.js';
import { HealthRecordsModule } from './health-records/health-records.module.js';
import { IncidentsModule } from './incidents/incidents.module.js';
import { PrescriptionsModule } from './prescriptions/prescriptions.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    CommonModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    UsersModule,
    HealthRecordsModule,
    ExportModule,
    PrescriptionsModule,
    IncidentsModule,
  ],
})
export class AppModule {}
