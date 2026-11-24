import { Injectable } from '@nestjs/common';
import type { ExportResult, ExportStrategy, HealthSnapshot } from './export-strategy.interface.js';

@Injectable()
export class JsonExportStrategy implements ExportStrategy {
  readonly format = 'json';
  readonly contentType = 'application/json';

  export(data: HealthSnapshot, userId: string, date: string): ExportResult {
    const content = JSON.stringify(data, null, 2);
    return {
      content,
      mimeType: this.contentType,
      filename: `historial-${userId}-${date}.json`,
    };
  }
}
