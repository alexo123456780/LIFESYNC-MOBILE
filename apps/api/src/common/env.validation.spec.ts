import { validateEnv } from './env.validation.js';

const valid = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://usuario@localhost:5432/db',
  JWT_PRIVATE_KEY_B64: 'cHJpdg==',
  JWT_PUBLIC_KEY_B64: 'cHVi',
  OAUTH_REDIRECT_URIS: 'lifesync://oauth/callback, exp://192.168.1.10:8081/--/oauth/callback',
};

describe('validateEnv', () => {
  it('acepta una configuración válida y aplica los valores por defecto', () => {
    expect(validateEnv(valid)).toMatchObject({
      PORT: 3000,
      JWT_ISSUER: 'lifesync-api',
      JWT_AUDIENCE: 'lifesync-mobile',
    });
  });

  it('convierte PORT a número', () => {
    expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('separa y limpia la lista de redirect URIs', () => {
    expect(validateEnv(valid).OAUTH_REDIRECT_URIS).toEqual([
      'lifesync://oauth/callback',
      'exp://192.168.1.10:8081/--/oauth/callback',
    ]);
  });

  it('respeta JWT_ISSUER y JWT_AUDIENCE cuando se definen', () => {
    const env = validateEnv({ ...valid, JWT_ISSUER: 'https://api.test', JWT_AUDIENCE: 'app' });
    expect(env).toMatchObject({ JWT_ISSUER: 'https://api.test', JWT_AUDIENCE: 'app' });
  });

  it.each([
    'DATABASE_URL',
    'JWT_PRIVATE_KEY_B64',
    'JWT_PUBLIC_KEY_B64',
    'OAUTH_REDIRECT_URIS',
  ] as const)('indica %s cuando falta', (key) => {
    const incompleta: Record<string, string> = { ...valid };
    delete incompleta[key];
    expect(() => validateEnv(incompleta)).toThrow(new RegExp(`${key} \\(requerida\\)`));
  });

  it('rechaza DATABASE_URL vacía', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: '  ' })).toThrow(/DATABASE_URL/);
  });

  it('indica NODE_ENV cuando falta o es desconocido', () => {
    const sinNodeEnv: Record<string, string> = { ...valid };
    delete sinNodeEnv.NODE_ENV;
    expect(() => validateEnv(sinNodeEnv)).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it.each(['0', '65536', 'abc', '3000.5'])('rechaza PORT inválido (%s)', (port) => {
    expect(() => validateEnv({ ...valid, PORT: port })).toThrow(/PORT/);
  });

  it('reporta todas las variables inválidas juntas', () => {
    expect(() => validateEnv({})).toThrow(/NODE_ENV.*DATABASE_URL.*JWT_PRIVATE_KEY_B64/);
  });
});
