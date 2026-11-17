const NODE_ENVS = ['development', 'test', 'production'] as const;

export interface Env {
  NODE_ENV: (typeof NODE_ENVS)[number];
  PORT: number;
  DATABASE_URL: string;
  JWT_PRIVATE_KEY_B64: string;
  JWT_PUBLIC_KEY_B64: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  /** Lista separada por comas; la comparación con el redirect_uri es exacta. */
  OAUTH_REDIRECT_URIS: string[];
}

const isBlank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

/** Falla al arrancar nombrando cada variable faltante o inválida. */
export function validateEnv(config: Record<string, unknown>): Env & Record<string, unknown> {
  const errors: string[] = [];

  const nodeEnv = config.NODE_ENV as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    errors.push(`NODE_ENV (debe ser ${NODE_ENVS.join(', ')})`);
  }

  if (isBlank(config.DATABASE_URL)) errors.push('DATABASE_URL (requerida)');
  if (isBlank(config.JWT_PRIVATE_KEY_B64)) errors.push('JWT_PRIVATE_KEY_B64 (requerida)');
  if (isBlank(config.JWT_PUBLIC_KEY_B64)) errors.push('JWT_PUBLIC_KEY_B64 (requerida)');

  const redirectUris = String(config.OAUTH_REDIRECT_URIS ?? '')
    .split(',')
    .map((uri) => uri.trim())
    .filter(Boolean);
  if (redirectUris.length === 0) errors.push('OAUTH_REDIRECT_URIS (requerida)');

  const port = config.PORT === undefined || config.PORT === '' ? 3000 : Number(config.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT (debe ser un entero entre 1 y 65535)');
  }

  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas: ${errors.join('; ')}`);
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: config.DATABASE_URL as string,
    JWT_PRIVATE_KEY_B64: config.JWT_PRIVATE_KEY_B64 as string,
    JWT_PUBLIC_KEY_B64: config.JWT_PUBLIC_KEY_B64 as string,
    JWT_ISSUER: isBlank(config.JWT_ISSUER) ? 'lifesync-api' : (config.JWT_ISSUER as string),
    JWT_AUDIENCE: isBlank(config.JWT_AUDIENCE)
      ? 'lifesync-mobile'
      : (config.JWT_AUDIENCE as string),
    OAUTH_REDIRECT_URIS: redirectUris,
  };
}
