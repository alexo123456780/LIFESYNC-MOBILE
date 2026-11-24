import {
  type AccelerometerSample,
  type AlertObserver,
  AlertSubject,
  type FallDetectionThresholds,
  type MedicalAlert,
  detectPossibleFall,
  evaluateCriticalDoseAlert,
  evaluatePendingSyncAlert,
} from './alerts';

describe('AlertSubject & Observer Pattern (LM-103)', () => {
  it('subscribe devuelve función de baja y deja de recibir alertas', () => {
    const subject = new AlertSubject();
    const observerMock: AlertObserver = { update: jest.fn() };

    const unsubscribe = subject.subscribe(observerMock);
    const alert: MedicalAlert = {
      id: '1',
      type: 'reminder',
      title: 'Tomar pastilla',
      message: 'Ibuprofeno 400mg',
      timestamp: new Date(),
    };

    subject.notify(alert);
    expect(observerMock.update).toHaveBeenCalledWith(alert);

    unsubscribe();
    subject.notify(alert);
    expect(observerMock.update).toHaveBeenCalledTimes(1);
  });

  it('notifica a los tres observadores suscritos', () => {
    const subject = new AlertSubject();
    const obs1: AlertObserver = { update: jest.fn() };
    const obs2: AlertObserver = { update: jest.fn() };
    const obs3: AlertObserver = { update: jest.fn() };

    subject.subscribe(obs1);
    subject.subscribe(obs2);
    subject.subscribe(obs3);

    const alert: MedicalAlert = {
      id: '2',
      type: 'reminder',
      title: 'Alerta',
      message: 'Prueba',
      timestamp: new Date(),
    };
    subject.notify(alert);

    expect(obs1.update).toHaveBeenCalledWith(alert);
    expect(obs2.update).toHaveBeenCalledWith(alert);
    expect(obs3.update).toHaveBeenCalledWith(alert);
  });

  it('un observador que falla no impide que los demás reciban la alerta', () => {
    const subject = new AlertSubject();
    const failingObs: AlertObserver = {
      update: jest.fn().mockImplementation(() => {
        throw new Error('Fallo crítico en observer');
      }),
    };
    const healthyObs: AlertObserver = { update: jest.fn() };

    subject.subscribe(failingObs);
    subject.subscribe(healthyObs);

    const alert: MedicalAlert = {
      id: '3',
      type: 'reminder',
      title: 'Alerta',
      message: 'Prueba de tolerancia a fallos',
      timestamp: new Date(),
    };

    expect(() => subject.notify(alert)).not.toThrow();
    expect(healthyObs.update).toHaveBeenCalledWith(alert);
  });
});

describe('Regla de Dosis Crítica sin Confirmar (LM-106)', () => {
  const controlledMed = {
    id: 'm1',
    name: 'Morfina',
    dose: '10mg',
    controlled: true,
  };

  const normalMed = {
    id: 'm2',
    name: 'Paracetamol',
    dose: '500mg',
    controlled: false,
  };

  const baseTime = new Date('2026-11-24T10:00:00.000Z');

  it('emite alerta si un medicamento controlado no se confirma a los 15 minutos', () => {
    const time15m = new Date('2026-11-24T10:15:00.000Z');
    const alert = evaluateCriticalDoseAlert(controlledMed, baseTime, time15m, null, 15);

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('critical_dose');
    expect(alert?.title).toBe('¡Dosis crítica sin confirmar!');
  });

  it('no emite alerta si el paciente confirma antes de los 15 minutos', () => {
    const confirmedAt = new Date('2026-11-24T10:10:00.000Z');
    const time15m = new Date('2026-11-24T10:15:00.000Z');
    const alert = evaluateCriticalDoseAlert(controlledMed, baseTime, time15m, confirmedAt, 15);

    expect(alert).toBeNull();
  });

  it('un medicamento no controlado nunca emite alerta de dosis crítica', () => {
    const time30m = new Date('2026-11-24T10:30:00.000Z');
    const alert = evaluateCriticalDoseAlert(normalMed, baseTime, time30m, null, 15);

    expect(alert).toBeNull();
  });
});

describe('Regla de Datos sin Sincronizar (LM-107)', () => {
  it('emite alerta con cambios pendientes y sin red por más de N horas (N configurable)', () => {
    const alert = evaluatePendingSyncAlert(3, true, 5.0, 4.0);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('sync_pending');
    expect(alert?.message).toContain('3 cambios pendientes');
    expect(alert?.message).toContain('5.0 horas sin red');
  });

  it('no emite alerta si no hay cambios pendientes o hay conexión a internet', () => {
    // Hay red
    expect(evaluatePendingSyncAlert(3, false, 10.0, 4.0)).toBeNull();
    // No hay cambios pendientes
    expect(evaluatePendingSyncAlert(0, true, 10.0, 4.0)).toBeNull();
  });

  it('no emite alerta si el tiempo sin red es menor a N horas', () => {
    expect(evaluatePendingSyncAlert(2, true, 2.5, 4.0)).toBeNull();
  });
});

describe('Detección Heurística de Caídas (LM-108)', () => {
  const customThresholds: FallDetectionThresholds = {
    impactG: 3.0,
    inactivityG: 0.2,
    inactivityDurationMs: 2000,
  };

  it('detecta una caída ante un pico de impacto seguido de inmovilidad', () => {
    const samples: AccelerometerSample[] = [
      { x: 0, y: 1.0, z: 0, timestamp: 0 },
      { x: 0, y: 1.1, z: 0, timestamp: 500 },
      // Pico de impacto > 3.0G
      { x: 2.5, y: 2.0, z: 1.5, timestamp: 1000 }, // magnitud ~3.53G
      // Período de inmovilidad de 2000 ms (magnitud ~1G)
      { x: 0.1, y: 0.98, z: 0.1, timestamp: 1500 },
      { x: 0.05, y: 1.0, z: 0.05, timestamp: 2500 },
      { x: 0.0, y: 1.0, z: 0.0, timestamp: 3100 },
    ];

    expect(detectPossibleFall(samples, customThresholds)).toBe(true);
  });

  it('no detecta caída con movimiento continuo normal sin inmovilidad post-impacto', () => {
    const samples: AccelerometerSample[] = [
      { x: 0, y: 1.0, z: 0, timestamp: 0 },
      { x: 2.5, y: 2.0, z: 1.5, timestamp: 1000 }, // impacto
      // Movimiento brusco continuo (corriendo/saltando)
      { x: 1.5, y: 1.8, z: 0.5, timestamp: 1500 },
      { x: 0.8, y: 1.6, z: 0.9, timestamp: 3100 },
    ];

    expect(detectPossibleFall(samples, customThresholds)).toBe(false);
  });

  it('no detecta caída sin pico de impacto', () => {
    const samples: AccelerometerSample[] = [
      { x: 0, y: 1.0, z: 0, timestamp: 0 },
      { x: 0.2, y: 1.1, z: 0.1, timestamp: 1000 },
      { x: 0.1, y: 1.0, z: 0.0, timestamp: 3100 },
    ];

    expect(detectPossibleFall(samples, customThresholds)).toBe(false);
  });
});
