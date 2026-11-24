import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CsvExportStrategy } from './csv-export.strategy.js';
import { ExportController } from './export.controller.js';
import { EXPORT_STRATEGIES } from './export-strategy.interface.js';
import { ExportService } from './export.service.js';
import { JsonExportStrategy } from './json-export.strategy.js';

@Module({
  imports: [AuthModule],
  controllers: [ExportController],
  providers: [
    JsonExportStrategy,
    CsvExportStrategy,
    {
      provide: EXPORT_STRATEGIES,
      useFactory: (json: JsonExportStrategy, csv: CsvExportStrategy) => [json, csv],
      inject: [JsonExportStrategy, CsvExportStrategy],
    },
    ExportService,
  ],
  exports: [ExportService],
})
export class ExportModule {}
