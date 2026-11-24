import { NotificationScheduler, type NotificationAdapter } from './notification-scheduler';

describe('NotificationScheduler (LM-104)', () => {
  let mockAdapter: NotificationAdapter;
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    mockAdapter = {
      requestPermission: jest.fn().mockResolvedValue(true),
      scheduleRepeatingNotification: jest.fn().mockResolvedValue('notif-sys-123'),
      cancelNotification: jest.fn().mockResolvedValue(undefined),
    };
    scheduler = new NotificationScheduler(mockAdapter);
  });

  it('programa notificación local periódica según frequencyHours con permiso concedido', async () => {
    const success = await scheduler.scheduleMedicationReminder('med-1', 'Insulina', '10 UI', 8);

    expect(success).toBe(true);
    expect(mockAdapter.requestPermission).toHaveBeenCalled();
    expect(mockAdapter.scheduleRepeatingNotification).toHaveBeenCalledWith(
      'med-1',
      'Hora de tu medicamento: Insulina',
      'Dosis programada: 10 UI (cada 8 horas)',
      8,
    );
    expect(scheduler.isScheduled('med-1')).toBe(true);
  });

  it('cancela y reprograma si el medicamento se actualiza', async () => {
    await scheduler.scheduleMedicationReminder('med-1', 'Insulina', '10 UI', 8);

    // Reprogramar con otra dosis y frecuencia
    await scheduler.scheduleMedicationReminder('med-1', 'Insulina', '15 UI', 12);

    expect(mockAdapter.cancelNotification).toHaveBeenCalledWith('notif-sys-123');
    expect(mockAdapter.scheduleRepeatingNotification).toHaveBeenCalledWith(
      'med-1',
      'Hora de tu medicamento: Insulina',
      'Dosis programada: 15 UI (cada 12 horas)',
      12,
    );
  });

  it('cancela la notificación si el medicamento se elimina', async () => {
    await scheduler.scheduleMedicationReminder('med-1', 'Insulina', '10 UI', 8);
    await scheduler.cancelMedicationReminder('med-1');

    expect(mockAdapter.cancelNotification).toHaveBeenCalledWith('notif-sys-123');
    expect(scheduler.isScheduled('med-1')).toBe(false);
  });

  it('si el permiso de notificaciones es denegado, no programa y no provoca crash', async () => {
    mockAdapter.requestPermission = jest.fn().mockResolvedValue(false);

    const success = await scheduler.scheduleMedicationReminder('med-2', 'Aspirina', '100 mg', 24);
    expect(success).toBe(false);
    expect(mockAdapter.scheduleRepeatingNotification).not.toHaveBeenCalled();
    expect(scheduler.isScheduled('med-2')).toBe(false);
  });
});
