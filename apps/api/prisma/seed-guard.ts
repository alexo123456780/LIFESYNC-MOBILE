export function assertSeedAllowed(env: Record<string, string | undefined>): void {
  if (env.NODE_ENV !== 'development') {
    throw new Error(
      `El seed solo corre con NODE_ENV=development (actual: ${env.NODE_ENV ?? 'sin definir'})`,
    );
  }
}
