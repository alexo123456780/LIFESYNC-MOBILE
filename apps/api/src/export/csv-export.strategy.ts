import { Injectable } from '@nestjs/common';
import type { ExportResult, ExportStrategy, HealthSnapshot } from './export-strategy.interface.js';

/** Escapa valores que podrían ser interpretados como fórmulas CSV por Excel/Sheets (=, +, -, @). */
export function escapeCsvCell(value: string): string {
  // Prefija con ' para evitar inyección CSV si empieza con =, +, -, @
  if (/^[=+\-@]/.test(value)) {
    value = `'${value}`;
  }
  // Si contiene coma, salto de línea, comilla doble o comilla simple inicial, envolver en comillas dobles y escapar " → ""
  if (value.includes(',') || value.includes('\n') || value.includes('"') || value.startsWith("'")) {
    value = `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function row(type: string, field: string, value: string): string {
  return `${escapeCsvCell(type)},${escapeCsvCell(field)},${escapeCsvCell(value)}`;
}

@Injectable()
export class CsvExportStrategy implements ExportStrategy {
  readonly format = 'csv';
  readonly contentType = 'text/csv';

  export(data: HealthSnapshot, userId: string, date: string): ExportResult {
    const lines: string[] = ['type,field,value'];

    // Perfil
    if (data.profile) {
      if (data.profile.bloodType) {
        lines.push(row('profile', 'bloodType', data.profile.bloodType));
      }
      if (data.profile.notes) {
        lines.push(row('profile', 'notes', data.profile.notes));
      }
    }

    // Alergias
    for (const allergy of data.allergies) {
      lines.push(row('allergy', 'name', allergy.name));
      lines.push(row('allergy', 'severity', allergy.severity));
    }

    // Medicamentos
    for (const med of data.medications) {
      lines.push(row('medication', 'name', med.name));
      lines.push(row('medication', 'dose', med.dose));
      lines.push(row('medication', 'frequencyHours', String(med.frequencyHours)));
      lines.push(row('medication', 'controlled', String(med.controlled)));
      lines.push(row('medication', 'startsAt', String(med.startsAt)));
      if (med.endsAt != null) {
        lines.push(row('medication', 'endsAt', String(med.endsAt)));
      }
    }

    // Contactos
    for (const contact of data.contacts) {
      lines.push(row('contact', 'name', contact.name));
      lines.push(row('contact', 'phone', contact.phone));
      lines.push(row('contact', 'relationship', contact.relationship));
    }

    const content = lines.join('\n');
    return {
      content,
      mimeType: this.contentType,
      filename: `historial-${userId}-${date}.csv`,
    };
  }
}
