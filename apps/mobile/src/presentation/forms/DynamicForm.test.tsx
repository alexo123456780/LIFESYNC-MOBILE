import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  allergySchema,
  emergencyContactSchema,
  healthProfileSchema,
  medicationSchema,
} from '../../domain/health-schemas';
import { MIN_TOUCH_TARGET } from '../theme';
import { DynamicForm } from './DynamicForm';
import {
  allergyFields,
  emergencyContactFields,
  healthProfileFields,
  medicationFields,
} from './health-form-definitions';

describe('DynamicForm — motor de formularios dinámicos reutilizable (LM-67)', () => {
  it('renderiza los cuatro tipos de campo (texto, selección, interruptor y fecha) con objetivos táctiles >= 44 px', async () => {
    const onSubmit = jest.fn();
    await render(
      <DynamicForm
        fields={medicationFields}
        schema={medicationSchema}
        initialValues={{
          name: 'Insulina',
          dose: '10 UI',
          frequencyHours: '8',
          controlled: false,
          startsAt: '2026-11-23',
          endsAt: '2026-11-30',
        }}
        submitLabel="Guardar medicamento"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText('Nombre del medicamento')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de inicio')).toBeTruthy();

    const toggle = screen.getByRole('switch', { name: 'Medicamento controlado' });
    await fireEvent(toggle, 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar medicamento' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Insulina',
        dose: '10 UI',
        frequencyHours: 8,
        controlled: true,
      }),
    );
  });

  it('renderiza campos de selección con objetivos táctiles >= 44 px y reutiliza la misma implementación en perfil', async () => {
    const onSubmit = jest.fn();
    await render(
      <DynamicForm
        fields={healthProfileFields}
        schema={healthProfileSchema}
        initialValues={{ bloodType: null as string | null, notes: '' }}
        submitLabel="Guardar perfil"
        onSubmit={onSubmit}
      />,
    );

    const oPosOption = screen.getByRole('radio', { name: 'Tipo de sangre: O+' });
    const chipStyle = StyleSheet.flatten(oPosOption.props.style);
    expect(chipStyle.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(chipStyle.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);

    await fireEvent.press(oPosOption);
    await fireEvent.changeText(screen.getByLabelText('Notas clínicas'), 'Sin cirugías previas');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(onSubmit).toHaveBeenCalledWith({
      bloodType: 'O_POS',
      notes: 'Sin cirugías previas',
    });
  });

  it('reutiliza el motor para alergias y muestra errores cuando falta el nombre o la severidad', async () => {
    const onSubmit = jest.fn();
    await render(
      <DynamicForm
        fields={allergyFields}
        schema={allergySchema}
        initialValues={{ name: '', severity: '' }}
        submitLabel="Guardar alergia"
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar alergia' }));

    expect(screen.getByText('Escribe el nombre de la alergia')).toBeTruthy();
    expect(screen.getByText('Selecciona una severidad válida')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Nombre de la alergia'), 'Látex');
    await fireEvent.press(screen.getByRole('radio', { name: 'Severidad: Severa' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar alergia' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Látex', severity: 'SEVERE' });
  });

  it('reutiliza el motor para contactos de emergencia y bloquea teléfono inválido', async () => {
    const onSubmit = jest.fn();
    await render(
      <DynamicForm
        fields={emergencyContactFields}
        schema={emergencyContactSchema}
        initialValues={{ name: 'Ana Ruiz', phone: 'invalido', relationship: 'Hermana' }}
        submitLabel="Guardar contacto"
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar contacto' }));

    expect(screen.getByText('Escribe un teléfono válido')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Teléfono'), '+52 999 555 0101');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar contacto' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Ana Ruiz',
      phone: '+52 999 555 0101',
      relationship: 'Hermana',
    });
  });
});
