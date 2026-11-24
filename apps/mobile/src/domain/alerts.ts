// Dominio y aplicación de Alertas médicas con patrón Observer (PRD 9.3, LM-103, LM-106, LM-107, LM-108)

export type AlertType = 'reminder' | 'critical_dose' | 'sync_pending' | 'possible_fall';

export interface MedicalAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface AlertObserver {
  update(alert: MedicalAlert): void;
}

/** Sujeto del patrón Observer (PRD 9.3, LM-103). */
export class AlertSubject {
  private readonly observers = new Set<AlertObserver>();

  subscribe(observer: AlertObserver): () => void {
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }

  notify(alert: MedicalAlert): void {
    this.observers.forEach((observer) => {
      try {
        observer.update(alert);
      } catch {
        // Un observador que falla no impide que los demás reciban la alerta (LM-103)
      }
    });
  }

  getObserverCount(): number {
    return this.observers.size;
  }
}

/** Observador 1: Registro histórico en memoria (LM-103, LM-105). */
export class AlertLogObserver implements AlertObserver {
  private readonly logs: MedicalAlert[] = [];

  update(alert: MedicalAlert): void {
    this.logs.unshift(alert);
  }

  getLogs(): readonly MedicalAlert[] {
    return this.logs;
  }

  clear(): void {
    this.logs.length = 0;
  }
}

/** Observador 2: Banners dentro de la app (LM-103). */
export class InAppBannerObserver implements AlertObserver {
  private currentBanner: MedicalAlert | null = null;
  private readonly listeners = new Set<(banner: MedicalAlert | null) => void>();

  update(alert: MedicalAlert): void {
    this.currentBanner = alert;
    this.listeners.forEach((l) => l(this.currentBanner));
  }

  getCurrentBanner(): MedicalAlert | null {
    return this.currentBanner;
  }

  dismiss(): void {
    this.currentBanner = null;
    this.listeners.forEach((l) => l(null));
  }

  onBannerChange(listener: (banner: MedicalAlert | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Observador 3: Notificaciones locales (LM-103, LM-104). */
export class LocalNotificationObserver implements AlertObserver {
  constructor(
    private readonly notificationScheduler: (title: string, body: string) => Promise<void> | void,
  ) {}

  update(alert: MedicalAlert): void {
    void this.notificationScheduler(alert.title, alert.message);
  }
}

// Singletons compartidos
export const alertSubject = new AlertSubject();
export const alertLogObserver = new AlertLogObserver();
export const inAppBannerObserver = new InAppBannerObserver();
export const localNotificationObserver = new LocalNotificationObserver((title, body) => {
  void title;
  void body;
  // En producción invoca expo-notifications si el permiso está concedido
});

// Suscripción de observadores predeterminados
alertSubject.subscribe(alertLogObserver);
alertSubject.subscribe(inAppBannerObserver);
alertSubject.subscribe(localNotificationObserver);

// ==========================================
// Regla LM-106: Dosis crítica sin confirmar a los 15 min
// ==========================================
export interface MedicationInfo {
  id: string;
  name: string;
  dose: string;
  controlled: boolean;
}

export function evaluateCriticalDoseAlert(
  medication: MedicationInfo,
  reminderTime: Date,
  currentTime: Date,
  confirmedTime?: Date | null,
  thresholdMinutes = 15,
): MedicalAlert | null {
  // Medicamentos no controlados nunca emiten alerta de dosis crítica
  if (!medication.controlled) {
    return null;
  }

  const elapsedMinutes = (currentTime.getTime() - reminderTime.getTime()) / (1000 * 60);

  // Si ya se confirmó dentro del tiempo límite, no emite
  if (
    confirmedTime &&
    confirmedTime.getTime() <= reminderTime.getTime() + thresholdMinutes * 60 * 1000
  ) {
    return null;
  }

  // Si pasaron 15 minutos o más sin confirmación
  if (elapsedMinutes >= thresholdMinutes) {
    return {
      id: `crit-${medication.id}-${reminderTime.getTime()}`,
      type: 'critical_dose',
      title: '¡Dosis crítica sin confirmar!',
      message: `Han pasado más de ${thresholdMinutes} minutos desde el recordatorio de ${medication.name} (${medication.dose}) sin confirmación.`,
      timestamp: currentTime,
      details: { medicationId: medication.id, elapsedMinutes },
    };
  }

  return null;
}

// ==========================================
// Regla LM-107: Datos sin sincronizar con netinfo
// ==========================================
export function evaluatePendingSyncAlert(
  pendingChangesCount: number,
  isOffline: boolean,
  offlineHours: number,
  thresholdHours: number,
): MedicalAlert | null {
  if (pendingChangesCount === 0 || !isOffline) {
    return null;
  }

  if (offlineHours >= thresholdHours) {
    return {
      id: `sync-pending-${Date.now()}`,
      type: 'sync_pending',
      title: 'Datos clínicos sin sincronizar',
      message: `Tienes ${pendingChangesCount} cambios pendientes y llevas ${offlineHours.toFixed(1)} horas sin red. Conéctate a internet para asegurar tu historial en la nube.`,
      timestamp: new Date(),
      details: { pendingChangesCount, offlineHours, thresholdHours },
    };
  }

  return null;
}

// ==========================================
// Regla LM-108: Detección heurística de caídas (acelerómetro)
// ==========================================
export interface AccelerometerSample {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface FallDetectionThresholds {
  impactG: number; // Umbral de impacto (ej. 2.5G)
  inactivityG: number; // Umbral de reposo/inmovilidad (ej. 0.3G de varianza)
  inactivityDurationMs: number; // Duración de reposo tras impacto (ej. 2000 ms)
}

export const defaultFallThresholds: FallDetectionThresholds = {
  impactG: 2.5,
  inactivityG: 0.3,
  inactivityDurationMs: 2000,
};

/**
 * Heurística de detección de posible caída:
 * 1. Detección de un pico de magnitud de impacto > impactG.
 * 2. Período subsiguiente de inmovilidad con variación de magnitud < inactivityG durante inactivityDurationMs.
 */
export function detectPossibleFall(
  samples: AccelerometerSample[],
  thresholds: FallDetectionThresholds = defaultFallThresholds,
): boolean {
  if (samples.length < 5) return false;

  let impactIndex = -1;
  let impactTime = 0;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const magnitude = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
    if (magnitude >= thresholds.impactG) {
      impactIndex = i;
      impactTime = s.timestamp;
      break;
    }
  }

  if (impactIndex === -1) {
    return false;
  }

  // Verificar período de inmovilidad post-impacto
  const postImpactSamples = samples.slice(impactIndex + 1);
  if (postImpactSamples.length === 0) return false;

  const lastSampleTime = postImpactSamples[postImpactSamples.length - 1].timestamp;
  if (lastSampleTime - impactTime < thresholds.inactivityDurationMs) {
    return false;
  }

  for (const s of postImpactSamples) {
    const magnitude = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
    // Varianza respecto a 1G terrestre
    const diff = Math.abs(magnitude - 1.0);
    if (diff > thresholds.inactivityG) {
      return false; // Hubo movimiento significativo, no hay inmovilidad
    }
  }

  return true;
}
