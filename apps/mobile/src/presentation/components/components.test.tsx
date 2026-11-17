import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, Card, LoadingIndicator, StatusBanner, TextField } from '.';
import { MIN_TOUCH_TARGET, colors } from '../theme';
import { Text } from 'react-native';

describe('Button', () => {
  it('es accesible: rol, etiqueta y objetivo táctil de al menos 44 px', async () => {
    await render(<Button label="Iniciar sesión" onPress={() => {}} />);
    const button = screen.getByRole('button', { name: 'Iniciar sesión' });
    expect(button).toHaveStyle({ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET });
  });

  it('usa accessibilityLabel cuando se indica', async () => {
    await render(
      <Button label="OK" accessibilityLabel="Confirmar cierre de sesión" onPress={() => {}} />,
    );
    expect(screen.getByLabelText('Confirmar cierre de sesión')).toBeOnTheScreen();
  });

  it('estado normal: ejecuta onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('estado deshabilitado: no ejecuta onPress y lo anuncia', async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Entrar' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ backgroundColor: colors.disabledSurface });
  });

  it('estado cargando: no admite el doble toque y se anuncia como ocupado', async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Entrar' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });

  it('la variante peligrosa usa el color de peligro del tema', async () => {
    await render(<Button label="Cerrar sesión" variant="danger" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveStyle({
      backgroundColor: colors.danger,
    });
  });
});

describe('TextField', () => {
  it('estado normal: etiqueta accesible, objetivo de 44 px y cambio de texto', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Correo electrónico" value="" onChangeText={onChangeText} />);
    const input = screen.getByLabelText('Correo electrónico');
    expect(input).toHaveStyle({ minHeight: MIN_TOUCH_TARGET });
    await fireEvent.changeText(input, 'ana@correo.com');
    expect(onChangeText).toHaveBeenCalledWith('ana@correo.com');
  });

  it('estado error: muestra el mensaje en una región viva y marca el borde', async () => {
    await render(<TextField label="Contraseña" value="x" error="Mínimo 12 caracteres" />);
    expect(screen.getByText('Mínimo 12 caracteres')).toBeOnTheScreen();
    expect(screen.getByLabelText('Contraseña')).toHaveStyle({ borderColor: colors.danger });
    expect(screen.getByLabelText('Contraseña').props.accessibilityHint).toBe(
      'Mínimo 12 caracteres',
    );
  });

  it('estado deshabilitado: no es editable', async () => {
    await render(<TextField label="Correo electrónico" value="a@b.co" editable={false} />);
    expect(screen.getByLabelText('Correo electrónico')).toBeDisabled();
  });
});

describe('StatusBanner', () => {
  it('un error se anuncia como alerta', async () => {
    await render(<StatusBanner tone="error" message="No se pudo registrar" />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo registrar');
  });

  it('el estado sin conexión usa una región viva amable y ofrece reintentar con 44 px', async () => {
    const onAction = jest.fn();
    await render(
      <StatusBanner
        tone="offline"
        message="Sin conexión"
        actionLabel="Reintentar"
        onAction={onAction}
      />,
    );
    const retry = screen.getByRole('button', { name: 'Reintentar' });
    expect(retry).toHaveStyle({ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET });
    await fireEvent.press(retry);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sin acción no muestra botón', async () => {
    await render(<StatusBanner tone="info" message="Sincronizando" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('LoadingIndicator y Card', () => {
  it('el indicador de carga se anuncia con su etiqueta', async () => {
    await render(<LoadingIndicator label="Conectando…" />);
    expect(screen.getByRole('progressbar', { name: 'Conectando…' })).toBeBusy();
  });

  it('la tarjeta agrupa contenido y admite etiqueta accesible', async () => {
    await render(
      <Card accessibilityLabel="Tipo de sangre">
        <Text>O+</Text>
      </Card>,
    );
    expect(screen.getByLabelText('Tipo de sangre')).toBeOnTheScreen();
  });
});

describe('uso exclusivo de los tokens del tema', () => {
  const sources = readdirSync(__dirname)
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
    .map((file) => [file, readFileSync(join(__dirname, file), 'utf8')] as const);

  it.each(sources)('%s no escribe colores ni tamaños a mano', (_file, source) => {
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\b(rgb|rgba|hsl)\(/);
    expect(source).not.toMatch(
      /\b(fontSize|lineHeight|minHeight|minWidth|padding\w*|margin\w*|gap|borderRadius|borderWidth)\s*:\s*\d/,
    );
  });

  it.each(sources)('%s no desactiva el escalado de texto del sistema', (_file, source) => {
    expect(source).not.toMatch(/allowFontScaling\s*=\s*\{?\s*false/);
  });
});
