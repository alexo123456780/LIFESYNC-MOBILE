import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import {
  allergySchema,
  emergencyContactSchema,
  medicationSchema,
  type AllergyValue,
  type EmergencyContactValue,
  type MedicationValue,
} from '../../domain/health-schemas';
import { TextField } from '../components';
import { ValidatedForm } from './ValidatedForm';
import { useValidatedForm } from './use-validated-form';

function ContactTestForm({ onSave }: { onSave: (value: EmergencyContactValue) => void }) {
  const form = useValidatedForm({
    schema: emergencyContactSchema,
    initialValues: { name: '', phone: '', relationship: '' },
    onSubmit: onSave,
  });

  return (
    <ValidatedForm
      submitLabel="Guardar contacto"
      canSubmit={form.canSubmit}
      submitting={form.submitting}
      onSubmit={() => void form.submit()}
    >
      <TextField
        label="Nombre"
        value={form.values.name}
        onChangeText={(text) => form.setFieldValue('name', text)}
        error={form.errors.name}
      />
      <TextField
        label="Teléfono"
        value={form.values.phone}
        onChangeText={(text) => form.setFieldValue('phone', text)}
        error={form.errors.phone}
      />
      <TextField
        label="Parentesco"
        value={form.values.relationship}
        onChangeText={(text) => form.setFieldValue('relationship', text)}
        error={form.errors.relationship}
      />
    </ValidatedForm>
  );
}

function MedicationTestForm({ onSave }: { onSave: (value: MedicationValue) => void }) {
  const form = useValidatedForm({
    schema: medicationSchema,
    initialValues: {
      name: 'Insulina',
      dose: '10 UI',
      frequencyHours: '0',
      controlled: true,
      startsAt: '2026-11-25T08:00:00.000Z',
      endsAt: '2026-11-24T08:00:00.000Z',
    },
    onSubmit: onSave,
  });

  return (
    <ValidatedForm
      submitLabel="Guardar medicamento"
      canSubmit={form.canSubmit}
      submitting={form.submitting}
      onSubmit={() => void form.submit()}
    >
      <TextField
        label="Frecuencia (horas)"
        value={form.values.frequencyHours}
        onChangeText={(text) => form.setFieldValue('frequencyHours', text)}
        error={form.errors.frequencyHours}
      />
      <TextField
        label="Fecha de fin"
        value={form.values.endsAt}
        onChangeText={(text) => form.setFieldValue('endsAt', text)}
        error={form.errors.endsAt}
      />
    </ValidatedForm>
  );
}

function AllergyTestForm({ onSave }: { onSave: (value: AllergyValue) => void }) {
  const form = useValidatedForm({
    schema: allergySchema,
    initialValues: { name: '', severity: 'SEVERE' as const },
    onSubmit: onSave,
  });

  return (
    <ValidatedForm
      submitLabel="Guardar alergia"
      canSubmit={form.canSubmit}
      submitting={form.submitting}
      onSubmit={() => void form.submit()}
    >
      <TextField
        label="Alergia"
        value={form.values.name}
        onChangeText={(text) => form.setFieldValue('name', text)}
        error={form.errors.name}
      />
    </ValidatedForm>
  );
}

describe('validación accesible y bloqueo de envío en formularios (LM-76)', () => {
  const announceSpy = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});

  beforeEach(() => {
    announceSpy.mockClear();
  });

  it('muestra errores junto a los campos, los anuncia al lector y no llama a la API si hay datos inválidos', async () => {
    const onSave = jest.fn();
    const { getByLabelText, getByRole, getByText } = await render(
      <ContactTestForm onSave={onSave} />,
    );

    fireEvent.press(getByRole('button', { name: 'Guardar contacto' }));

    await waitFor(() => {
      expect(getByText('Escribe el nombre del contacto')).toBeTruthy();
      expect(getByText('Escribe el teléfono del contacto')).toBeTruthy();
      expect(getByText('Escribe el parentesco o relación')).toBeTruthy();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(
      getByRole('button', { name: 'Guardar contacto' }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(announceSpy).toHaveBeenCalledWith(
      expect.stringContaining('Escribe el nombre del contacto'),
    );
    expect(getByLabelText('Nombre').props.accessibilityHint).toBe('Escribe el nombre del contacto');
  });

  it('al corregir los datos desaparecen los errores, se habilita guardar y se envía el valor validado', async () => {
    const onSave = jest.fn();
    const { getByLabelText, getByRole, queryByText } = await render(
      <AllergyTestForm onSave={onSave} />,
    );

    fireEvent.press(getByRole('button', { name: 'Guardar alergia' }));
    await waitFor(() => {
      expect(queryByText('Escribe el nombre de la alergia')).toBeTruthy();
    });
    expect(getByRole('button', { name: 'Guardar alergia' }).props.accessibilityState.disabled).toBe(
      true,
    );

    fireEvent.changeText(getByLabelText('Alergia'), '  Penicilina  ');

    await waitFor(() => {
      expect(queryByText('Escribe el nombre de la alergia')).toBeNull();
      expect(
        getByRole('button', { name: 'Guardar alergia' }).props.accessibilityState.disabled,
      ).toBe(false);
    });

    fireEvent.press(getByRole('button', { name: 'Guardar alergia' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: 'Penicilina', severity: 'SEVERE' });
    });
  });

  it('bloquea medicamentos con frecuencia no positiva o endsAt anterior a startsAt y habilita al corregir', async () => {
    const onSave = jest.fn();
    const { getByLabelText, getByRole, getByText, queryByText } = await render(
      <MedicationTestForm onSave={onSave} />,
    );

    fireEvent.press(getByRole('button', { name: 'Guardar medicamento' }));

    await waitFor(() => {
      expect(getByText('La frecuencia debe ser mayor a 0 horas')).toBeTruthy();
      expect(getByText('La fecha de fin no puede ser anterior a la fecha de inicio')).toBeTruthy();
    });
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.changeText(getByLabelText('Frecuencia (horas)'), '8');
    fireEvent.changeText(getByLabelText('Fecha de fin'), '2026-11-30T08:00:00.000Z');

    await waitFor(() => {
      expect(queryByText('La frecuencia debe ser mayor a 0 horas')).toBeNull();
      expect(queryByText('La fecha de fin no puede ser anterior a la fecha de inicio')).toBeNull();
    });

    fireEvent.press(getByRole('button', { name: 'Guardar medicamento' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Insulina',
        dose: '10 UI',
        frequencyHours: 8,
        controlled: true,
        startsAt: '2026-11-25T08:00:00.000Z',
        endsAt: '2026-11-30T08:00:00.000Z',
      });
    });
  });
});
