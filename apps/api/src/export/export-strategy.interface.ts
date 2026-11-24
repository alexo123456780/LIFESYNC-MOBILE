export const EXPORT_STRATEGIES = Symbol('EXPORT_STRATEGIES');

/** Snapshot de salud del usuario exportable. */
export interface HealthSnapshot {
  profile: {
    bloodType: string | null;
    notes: string | null;
  } | null;
  allergies: Array<{ name: string; severity: string }>;
  medications: Array<{
    name: string;
    dose: string;
    frequencyHours: number;
    controlled: boolean;
    startsAt: Date | string;
    endsAt: Date | string | null;
  }>;
  contacts: Array<{ name: string; phone: string; relationship: string }>;
}

/** Resultado de una exportación. */
export interface ExportResult {
  content: string;
  mimeType: string;
  filename: string;
}

/** Interfaz Strategy para exportación de datos de salud (PRD 9.2). */
export interface ExportStrategy {
  readonly format: string;
  readonly contentType: string;
  export(data: HealthSnapshot, userId: string, date: string): ExportResult;
}
