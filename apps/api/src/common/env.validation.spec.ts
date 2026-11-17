import { validateEnv } from './env.validation.js';

const valid = { NODE_ENV: 'test', DATABASE_URL: 'postgresql://usuario@localhost:5432/db' };

describe('validateEnv', () => {
  it('acepta una configuración válida y usa el puerto 3000 por defecto', () => {
    expect(validateEnv(valid)).toMatchObject({ ...valid, PORT: 3000 });
  });

  it('convierte PORT a número', () => {
    expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('indica DATABASE_URL cuando falta', () => {
    expect(() => validateEnv({ NODE_ENV: 'test' })).toThrow(/DATABASE_URL \(requerida\)/);
  });

  it('rechaza DATABASE_URL vacía', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: '  ' })).toThrow(/DATABASE_URL/);
  });

  it('indica NODE_ENV cuando falta o es desconocido', () => {
    expect(() => validateEnv({ DATABASE_URL: valid.DATABASE_URL })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it.each(['0', '65536', 'abc', '3000.5'])('rechaza PORT inválido (%s)', (port) => {
    expect(() => validateEnv({ ...valid, PORT: port })).toThrow(/PORT/);
  });

  it('reporta todas las variables inválidas juntas', () => {
    expect(() => validateEnv({})).toThrow(/NODE_ENV.*DATABASE_URL/);
  });
});
