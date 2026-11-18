import { contrastRatio } from './contrast';
import { MIN_TOUCH_TARGET, colors, fontSize, lineHeight, spacing, textPairs } from './tokens';

describe('contrastRatio', () => {
  it('calcula los extremos y un valor de referencia', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Gris #767676 sobre blanco: 4.54:1 (referencia clásica de WCAG).
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('es simétrica', () => {
    expect(contrastRatio(colors.text, colors.background)).toBeCloseTo(
      contrastRatio(colors.background, colors.text),
      10,
    );
  });
});

describe('tema', () => {
  it.each(textPairs)('texto %s sobre %s cumple AA (4.5:1)', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('el borde de los controles cumple 3:1 contra el fondo (componentes de interfaz)', () => {
    expect(contrastRatio(colors.border, colors.background)).toBeGreaterThanOrEqual(3);
  });

  it('fija un objetivo táctil mínimo de 44 px', () => {
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
  });

  it('la escala tipográfica es creciente y el interlineado supera al tamaño', () => {
    const sizes = Object.values(fontSize);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    for (const key of Object.keys(fontSize) as Array<keyof typeof fontSize>) {
      expect(lineHeight[key]).toBeGreaterThan(fontSize[key]);
    }
  });

  it('el cuerpo del texto no baja de 16 px', () => {
    expect(fontSize.body).toBeGreaterThanOrEqual(16);
  });

  it('los espaciados son crecientes', () => {
    const values = Object.values(spacing);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});
