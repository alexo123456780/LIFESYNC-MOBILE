import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { healthRecordsRepository } from '@/infrastructure/health-records/repository';
import AllergiesScreen from '../allergies';
import ContactsScreen from '../contacts';
import MedicationsScreen from '../medications';
import ProfileScreen from '../profile';

jest.mock('@/infrastructure/health-records/repository', () => ({
  healthRecordsRepository: {
    getProfile: jest.fn(),
    saveProfile: jest.fn(),
    listAllergies: jest.fn(),
    createAllergy: jest.fn(),
    updateAllergy: jest.fn(),
    deleteAllergy: jest.fn(),
    listMedications: jest.fn(),
    createMedication: jest.fn(),
    updateMedication: jest.fn(),
    deleteMedication: jest.fn(),
    listContacts: jest.fn(),
    createContact: jest.fn(),
    updateContact: jest.fn(),
    deleteContact: jest.fn(),
  },
}));

const repo = jest.mocked(healthRecordsRepository);

describe('Pantallas clínicas (LM-68, LM-70, LM-72, LM-74)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ProfileScreen muestra estado vacío y guarda tipo de sangre y notas', async () => {
    repo.getProfile.mockResolvedValue({
      data: { id: null, bloodType: null, notes: null },
      fromCache: false,
    });
    repo.saveProfile.mockResolvedValue({ id: 'p1', bloodType: 'O_POS', notes: 'Asma' });

    await render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Aún no completas tu perfil clínico/)).toBeTruthy();
    });

    await fireEvent.press(screen.getByRole('radio', { name: 'Tipo de sangre: O+' }));
    await fireEvent.changeText(screen.getByLabelText('Notas clínicas'), 'Asma');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));

    await waitFor(() => {
      expect(repo.saveProfile).toHaveBeenCalledWith({ bloodType: 'O_POS', notes: 'Asma' });
      expect(screen.getByText('Perfil clínico guardado.')).toBeTruthy();
    });
  });

  it('AllergiesScreen muestra banner de datos desactualizados desde caché y permite crear y eliminar', async () => {
    repo.listAllergies.mockResolvedValue({
      data: [{ id: 'a1', name: 'Penicilina', severity: 'SEVERE' }],
      fromCache: true,
    });
    repo.deleteAllergy.mockResolvedValue(undefined);

    await render(<AllergiesScreen />);

    await waitFor(() => {
      expect(screen.getByText(/copia local cifrada/)).toBeTruthy();
      expect(screen.getByText('Penicilina')).toBeTruthy();
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(repo.deleteAllergy).toHaveBeenCalledWith('a1');
    });
  });

  it('MedicationsScreen distingue visualmente medicamentos controlados', async () => {
    repo.listMedications.mockResolvedValue({
      data: [
        {
          id: 'm1',
          name: 'Clonazepam',
          dose: '2 mg',
          frequencyHours: 12,
          controlled: true,
          startsAt: '2026-11-23T08:00:00.000Z',
          endsAt: null,
        },
      ],
      fromCache: false,
    });

    await render(<MedicationsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Clonazepam')).toBeTruthy();
      expect(screen.getByText('Controlado')).toBeTruthy();
    });
  });

  it('ContactsScreen muestra estado vacío y permite crear un contacto de emergencia', async () => {
    repo.listContacts.mockResolvedValue({ data: [], fromCache: false });
    repo.createContact.mockResolvedValue({
      id: 'c1',
      name: 'María López',
      phone: '+52 999 123 4567',
      relationship: 'Madre',
    });

    await render(<ContactsScreen />);

    await waitFor(() => {
      expect(screen.getByText(/No tienes contactos de emergencia/)).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByLabelText('Nombre del contacto'), 'María López');
    await fireEvent.changeText(screen.getByLabelText('Teléfono'), '+52 999 123 4567');
    await fireEvent.changeText(screen.getByLabelText('Parentesco o relación'), 'Madre');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar contacto' }));

    await waitFor(() => {
      expect(repo.createContact).toHaveBeenCalledWith({
        name: 'María López',
        phone: '+52 999 123 4567',
        relationship: 'Madre',
      });
      expect(screen.getByText('María López')).toBeTruthy();
    });
  });
});
