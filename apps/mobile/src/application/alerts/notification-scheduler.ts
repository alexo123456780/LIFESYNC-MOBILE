// Programador de notificaciones locales de medicamentos (LM-104, RF-M12)
import { alertSubject } from '@/domain/alerts';

export interface NotificationAdapter {
  requestPermission: () => Promise<boolean>;
  scheduleRepeatingNotification: (
    id: string,
    title: string,
    body: string,
    hours: number,
  ) => Promise<string>;
  cancelNotification: (notificationId: string) => Promise<void>;
}

export class NotificationScheduler {
  private readonly scheduledIds = new Map<string, string>();

  constructor(private readonly adapter: NotificationAdapter) {}

  async scheduleMedicationReminder(
    medicationId: string,
    medicationName: string,
    dose: string,
    frequencyHours: number,
  ): Promise<boolean> {
    const hasPermission = await this.adapter.requestPermission();
    if (!hasPermission) {
      // Degrada elegantemente: no rompe la app, emite alerta in-app
      alertSubject.notify({
        id: `perm-denied-${Date.now()}`,
        type: 'reminder',
        title: 'Permiso de notificaciones denegado',
        message:
          'No podremos enviarte recordatorios cuando la app esté cerrada. Las alertas se mostrarán dentro de la app.',
        timestamp: new Date(),
      });
      return false;
    }

    // Cancelar recordatorio anterior si existía para reprogramar
    await this.cancelMedicationReminder(medicationId);

    const title = `Hora de tu medicamento: ${medicationName}`;
    const body = `Dosis programada: ${dose} (cada ${frequencyHours} horas)`;
    const notifId = await this.adapter.scheduleRepeatingNotification(
      medicationId,
      title,
      body,
      frequencyHours,
    );

    this.scheduledIds.set(medicationId, notifId);
    return true;
  }

  async cancelMedicationReminder(medicationId: string): Promise<void> {
    const existing = this.scheduledIds.get(medicationId);
    if (existing) {
      await this.adapter.cancelNotification(existing);
      this.scheduledIds.delete(medicationId);
    }
  }

  isScheduled(medicationId: string): boolean {
    return this.scheduledIds.has(medicationId);
  }
}
