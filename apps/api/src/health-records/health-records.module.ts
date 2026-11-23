import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { HealthRecordsController } from './health-records.controller.js';
import { HealthRecordsService } from './health-records.service.js';

@Module({
  imports: [AuthModule],
  controllers: [HealthRecordsController],
  providers: [HealthRecordsService],
})
export class HealthRecordsModule {}
