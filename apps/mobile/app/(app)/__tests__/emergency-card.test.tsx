import { render, screen } from '@testing-library/react-native';
import EmergencyCardScreen from '../emergency-card';
import { healthRecordsRepository } from '@/infrastructure/health-records/repository';

jest.mock('@/infrastructure/health-records/repository', () => ({
  healthRecordsRepository: {
    getProfile: jest.fn(),
    listAllergies: jest.fn(),
    listMedications: jest.fn(),
    listContacts: jest.fn(),
  },
}));

describe('EmergencyCardScreen (LM-110, LM-88)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra tipo de sangre, alergias, medicamentos y contactos desde la caché', async () => {
    (healthRecordsRepository.getProfile as jest.Mock).mockResolvedValue({
      data: { bloodType: 'O_POS', notes: 'Asma leve' },
      fromCache: true,
    });
    (healthRecordsRepository.listAllergies as jest.Mock).mockResolvedValue({
      data: [{ id: 'a1', name: 'Penicilina', severity: 'SEVERE' }],
      fromCache: true,
    });
    (healthRecordsRepository.listMedications as jest.Mock).mockResolvedValue({
      data: [{ id: 'm1', name: 'Insulina', dose: '10 UI', controlled: true }],
      fromCache: true,
    });
    (healthRecordsRepository.listContacts as jest.Mock).mockResolvedValue({
      data: [{ id: 'c1', name: 'Mamá', phone: '555-1234', relationship: 'Madre' }],
      fromCache: true,
    });

    await render(<EmergencyCardScreen />);

    expect(screen.getByText('O POS')).toBeTruthy();
    expect(screen.getByText(/Nota médica: Asma leve/)).toBeTruthy();
    expect(screen.getByText('• Penicilina')).toBeTruthy();
    expect(screen.getByText('• Insulina (10 UI)')).toBeTruthy();
    expect(screen.getByText('CONTROLADO')).toBeTruthy();
    expect(screen.getByText('Mamá (Madre)')).toBeTruthy();
    expect(screen.getByText('Tel: 555-1234')).toBeTruthy();
    expect(screen.getByText(/Modo sin conexión/)).toBeTruthy();
  });

  it('muestra estado vacío si el usuario no tiene datos médicos', async () => {
    (healthRecordsRepository.getProfile as jest.Mock).mockResolvedValue({
      data: { bloodType: null, notes: null },
      fromCache: false,
    });
    (healthRecordsRepository.listAllergies as jest.Mock).mockResolvedValue({
      data: [],
      fromCache: false,
    });
    (healthRecordsRepository.listMedications as jest.Mock).mockResolvedValue({
      data: [],
      fromCache: false,
    });
    (healthRecordsRepository.listContacts as jest.Mock).mockResolvedValue({
      data: [],
      fromCache: false,
    });

    await render(<EmergencyCardScreen />);

    expect(screen.getByText(/No hay datos médicos de emergencia registrados/)).toBeTruthy();
  });
});
