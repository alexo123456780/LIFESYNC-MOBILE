const NODE_ENVS = ['development', 'test', 'production'] as const;

export interface Env {
  NODE_ENV: (typeof NODE_ENVS)[number];
  PORT: number;
  DATABASE_URL: string;
}

/** Falla al arrancar nombrando cada variable faltante o inválida. */
export function validateEnv(config: Record<string, unknown>): Env & Record<string, unknown> {
  const errors: string[] = [];

  const nodeEnv = config.NODE_ENV as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    errors.push(`NODE_ENV (debe ser ${NODE_ENVS.join(', ')})`);
  }

  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    errors.push('DATABASE_URL (requerida)');
  }

  const port = config.PORT === undefined || config.PORT === '' ? 3000 : Number(config.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT (debe ser un entero entre 1 y 65535)');
  }

  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas: ${errors.join('; ')}`);
  }

  return { ...config, NODE_ENV: nodeEnv, PORT: port, DATABASE_URL: databaseUrl as string };
}
